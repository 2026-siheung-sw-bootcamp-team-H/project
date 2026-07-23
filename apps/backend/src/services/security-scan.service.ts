import {
  Prisma,
  ServiceStatus,
  SecurityScanStage,
  SecurityScanStatus,
  type SecurityScanFinding
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { enqueueSecurityJob } from "./job.service.js";

type ZapAlert = {
  pluginId?: string;
  alertRef?: string;
  alert?: string;
  name?: string;
  risk?: string;
  confidence?: string;
  url?: string;
  method?: string;
  param?: string;
  evidence?: string;
  description?: string;
  solution?: string;
  reference?: string;
};

type ProgressReporter = (progress: number) => Promise<unknown>;

const terminalStatuses = new Set<SecurityScanStatus>([
  SecurityScanStatus.COMPLETED,
  SecurityScanStatus.FAILED
]);

function truncate(value: string | undefined, maxLength: number) {
  return value ? value.slice(0, maxLength) : null;
}

async function zapRequest<T>(
  component: string,
  type: "action" | "view",
  name: string,
  params = {}
) {
  const url = new URL(`/JSON/${component}/${type}/${name}/`, env.zapApiUrl);
  url.searchParams.set("apikey", env.zapApiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`ZAP API ${response.status}: ${name}`);
  const body = (await response.json()) as T & { code?: string; message?: string };
  if (body.code) throw new Error(`ZAP API ${body.code}: ${body.message ?? name}`);
  return body;
}

async function waitForZap() {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      return await zapRequest<{ version: string }>("core", "view", "version");
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("ZAP did not become ready.");
}

async function updateScanProgress(
  scanRunId: string,
  status: SecurityScanStatus,
  progress: number,
  reportProgress: ProgressReporter
) {
  await Promise.all([
    prisma.securityScanRun.update({ where: { id: scanRunId }, data: { status, progress } }),
    reportProgress(progress)
  ]);
}

async function pollZapScan(
  scanRunId: string,
  component: "spider" | "ascan",
  zapScanId: string,
  status: SecurityScanStatus,
  progressStart: number,
  progressEnd: number,
  deadline: number,
  reportProgress: ProgressReporter
) {
  let previous = -1;
  while (Date.now() < deadline) {
    const result = await zapRequest<{ status: string }>(component, "view", "status", {
      scanId: zapScanId
    });
    const zapProgress = Math.max(0, Math.min(100, Number(result.status) || 0));
    const progress = Math.round(
      progressStart + ((progressEnd - progressStart) * zapProgress) / 100
    );
    if (progress !== previous) {
      await updateScanProgress(scanRunId, status, progress, reportProgress);
      previous = progress;
    }
    if (zapProgress >= 100) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await zapRequest(component, "action", "stop", { scanId: zapScanId }).catch(() => undefined);
  throw new Error(`ZAP ${component} scan exceeded the configured timeout.`);
}

export async function createSecurityScan(input: {
  stage: SecurityScanStage;
  protectedServiceId?: string;
  ruleId?: string;
  deploymentId?: string;
}) {
  if (!env.zapEnabled) {
    throw new AppError("ZAP 자동 스캔이 비활성화되어 있습니다.", 503, "ZAP_DISABLED");
  }
  if (!env.queueEnabled) {
    throw new AppError("ZAP 스캔에는 BullMQ Worker가 필요합니다.", 503, "QUEUE_DISABLED");
  }
  const ruleBoundStage =
    input.stage === SecurityScanStage.BEFORE_DEPLOYMENT ||
    input.stage === SecurityScanStage.SHADOW_VERIFICATION ||
    input.stage === SecurityScanStage.AFTER_DEPLOYMENT;
  if (ruleBoundStage && !input.ruleId) {
    throw new AppError("배포 전·후 스캔에는 ruleId가 필요합니다.", 400, "RULE_ID_REQUIRED");
  }
  const [requestedService, rule, deployment] = await Promise.all([
    input.protectedServiceId
      ? prisma.protectedService.findUnique({ where: { id: input.protectedServiceId } })
      : null,
    input.ruleId ? prisma.signatureRule.findUnique({ where: { id: input.ruleId } }) : null,
    input.deploymentId
      ? prisma.deploymentHistory.findUnique({ where: { id: input.deploymentId } })
      : null
  ]);
  const service =
    requestedService ??
    (rule
      ? await prisma.protectedService.findUnique({ where: { id: rule.protectedServiceId } })
      : await prisma.protectedService.findUnique({ where: { slug: "demo-shop" } }));
  if (!service)
    throw new AppError("스캔할 보호 서비스를 찾을 수 없습니다.", 404, "SERVICE_NOT_FOUND");
  if (service.status === ServiceStatus.DISABLED) {
    throw new AppError("비활성화된 서비스는 스캔할 수 없습니다.", 409, "SERVICE_DISABLED");
  }
  if (
    input.stage === SecurityScanStage.INITIAL_SCAN &&
    service.status !== ServiceStatus.CONNECTED
  ) {
    throw new AppError(
      "연결 테스트를 통과한 서비스만 초기 보안 진단을 시작할 수 있습니다.",
      409,
      "SERVICE_CONNECTION_REQUIRED"
    );
  }
  if (input.ruleId && !rule) throw new AppError("룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  if (rule && rule.protectedServiceId !== service.id) {
    throw new AppError("룰과 보호 서비스가 일치하지 않습니다.", 400, "INVALID_SCAN_RULE");
  }
  if (input.deploymentId && (!deployment || deployment.ruleId !== input.ruleId)) {
    throw new AppError("배포 이력이 요청한 룰과 일치하지 않습니다.", 400, "INVALID_DEPLOYMENT");
  }

  const staleBefore = new Date(Date.now() - env.zapScanTimeoutMs - 60_000);
  await prisma.securityScanRun.updateMany({
    where: { activeKey: "zap", updatedAt: { lt: staleBefore } },
    data: {
      activeKey: null,
      status: SecurityScanStatus.FAILED,
      completedAt: new Date(),
      errorMessage: "Stale ZAP scan lock recovered."
    }
  });

  try {
    const scan = await prisma.securityScanRun.create({
      data: {
        activeKey: "zap",
        protectedServiceId: service.id,
        ruleId: input.ruleId,
        deploymentId: input.deploymentId,
        stage: input.stage,
        targetUrl: service.proxyUrl ?? service.publicDomain ?? service.originUrl ?? service.apiUrl
      }
    });
    const job = await enqueueSecurityJob("run-zap-scan", { scanRunId: scan.id });
    return { scan, job };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("다른 ZAP 스캔이 이미 실행 중입니다.", 409, "ZAP_SCAN_ALREADY_RUNNING");
    }
    throw error;
  }
}

export async function runSecurityScan(scanRunId: string, reportProgress: ProgressReporter) {
  const scan = await prisma.securityScanRun.findUnique({ where: { id: scanRunId } });
  if (!scan) throw new Error("Security scan run not found.");
  if (terminalStatuses.has(scan.status)) return scan;
  const deadline = Date.now() + env.zapScanTimeoutMs;
  const replacerDescription = `aegis-simulation-${scan.id}`;
  try {
    await prisma.securityScanRun.update({
      where: { id: scan.id },
      data: { status: SecurityScanStatus.SPIDERING, progress: 1, startedAt: new Date() }
    });
    await reportProgress(1);
    await waitForZap();
    await zapRequest("core", "action", "newSession", {
      name: `siheung-${scan.id}`,
      overwrite: true
    });
    await zapRequest("replacer", "action", "addRule", {
      description: replacerDescription,
      enabled: true,
      matchType: "REQ_HEADER",
      matchRegex: false,
      matchString: "X-Aegis-Simulation-Id",
      replacement: scan.id
    });
    const target = new URL(scan.targetUrl);
    const targetBase = new URL(target.pathname.endsWith("/") ? target.toString() : `${target}/`);
    const seedUrls = [
      new URL("products", targetBase).toString(),
      new URL("search?q=notebook", targetBase).toString()
    ];
    for (const seedUrl of seedUrls) {
      await zapRequest("core", "action", "accessUrl", {
        url: seedUrl,
        followRedirects: true
      });
    }
    const spider = await zapRequest<{ scan: string }>("spider", "action", "scan", {
      url: scan.targetUrl,
      recurse: true,
      subtreeOnly: true,
      maxChildren: 50
    });
    await prisma.securityScanRun.update({
      where: { id: scan.id },
      data: { zapSpiderScanId: spider.scan }
    });
    await pollZapScan(
      scan.id,
      "spider",
      spider.scan,
      SecurityScanStatus.SPIDERING,
      5,
      35,
      deadline,
      reportProgress
    );

    const active = await zapRequest<{ scan: string }>("ascan", "action", "scan", {
      url: scan.targetUrl,
      recurse: true,
      inScopeOnly: false
    });
    await prisma.securityScanRun.update({
      where: { id: scan.id },
      data: {
        zapActiveScanId: active.scan,
        status: SecurityScanStatus.ACTIVE_SCANNING,
        progress: 40
      }
    });
    await pollZapScan(
      scan.id,
      "ascan",
      active.scan,
      SecurityScanStatus.ACTIVE_SCANNING,
      40,
      90,
      deadline,
      reportProgress
    );
    await updateScanProgress(scan.id, SecurityScanStatus.COLLECTING_RESULTS, 95, reportProgress);
    const result = await zapRequest<{ alerts?: ZapAlert[] }>("core", "view", "alerts", {
      baseurl: scan.targetUrl,
      start: 0,
      count: 5000
    });
    const alerts = result.alerts ?? [];
    const countRisk = (risk: string) =>
      alerts.filter((alert) => (alert.risk ?? "").toLowerCase() === risk).length;
    await prisma.$transaction(async (transaction) => {
      if (alerts.length > 0) {
        await transaction.securityScanFinding.createMany({
          data: alerts.map((alert) => ({
            scanRunId: scan.id,
            pluginId: truncate(alert.pluginId ?? alert.alertRef, 100) ?? "unknown",
            alert: truncate(alert.alert ?? alert.name, 500) ?? "Unknown ZAP alert",
            risk: truncate(alert.risk, 50) ?? "Informational",
            confidence: truncate(alert.confidence, 50) ?? "Unknown",
            url: truncate(alert.url, 2000) ?? scan.targetUrl,
            method: truncate(alert.method, 20),
            parameter: truncate(alert.param, 500),
            evidence: truncate(alert.evidence, 4000),
            description: truncate(alert.description, 8000),
            solution: truncate(alert.solution, 8000),
            reference: truncate(alert.reference, 8000)
          }))
        });
      }
      await transaction.securityScanRun.update({
        where: { id: scan.id },
        data: {
          activeKey: null,
          status: SecurityScanStatus.COMPLETED,
          progress: 100,
          alertCount: alerts.length,
          highCount: countRisk("high"),
          mediumCount: countRisk("medium"),
          lowCount: countRisk("low"),
          informationalCount: countRisk("informational"),
          completedAt: new Date()
        }
      });
    });
    await reportProgress(100);
    await zapRequest("replacer", "action", "removeRule", {
      description: replacerDescription
    }).catch(() => undefined);
    return getSecurityScan(scan.id);
  } catch (error) {
    await zapRequest("replacer", "action", "removeRule", {
      description: replacerDescription
    }).catch(() => undefined);
    await prisma.securityScanRun.update({
      where: { id: scan.id },
      data: {
        activeKey: null,
        status: SecurityScanStatus.FAILED,
        errorMessage: (error instanceof Error ? error.message : "Unknown ZAP error").slice(0, 2000),
        completedAt: new Date()
      }
    });
    throw error;
  }
}

export async function listSecurityScans(filters: {
  protectedServiceId?: string;
  ruleId?: string;
  stage?: SecurityScanStage;
  status?: SecurityScanStatus;
  limit?: number;
}) {
  return prisma.securityScanRun.findMany({
    where: {
      protectedServiceId: filters.protectedServiceId,
      ruleId: filters.ruleId,
      stage: filters.stage,
      status: filters.status
    },
    include: { rule: true, deployment: true, _count: { select: { findings: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(filters.limit ?? 50, 100)
  });
}

export async function getSecurityScan(id: string) {
  const scan = await prisma.securityScanRun.findUnique({
    where: { id },
    include: {
      protectedService: true,
      rule: true,
      deployment: true,
      findings: { orderBy: [{ risk: "asc" }, { alert: "asc" }] }
    }
  });
  if (!scan) throw new AppError("ZAP 스캔을 찾을 수 없습니다.", 404, "SCAN_NOT_FOUND");
  return scan;
}

export async function getSecurityScanProgress(id: string) {
  const scan = await prisma.securityScanRun.findUnique({
    where: { id },
    select: {
      id: true,
      ruleId: true,
      deploymentId: true,
      stage: true,
      status: true,
      progress: true,
      alertCount: true,
      highCount: true,
      mediumCount: true,
      lowCount: true,
      informationalCount: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  if (!scan) throw new AppError("ZAP 스캔을 찾을 수 없습니다.", 404, "SCAN_NOT_FOUND");
  return scan;
}

function findingKey(finding: Pick<SecurityScanFinding, "pluginId" | "url" | "parameter">) {
  return `${finding.pluginId}|${finding.url}|${finding.parameter ?? ""}`;
}

export function summarizeSecurityScanComparison<
  T extends Pick<SecurityScanFinding, "pluginId" | "url" | "parameter">
>(
  before: { alertCount: number; highCount: number; mediumCount: number; findings: T[] },
  after: { alertCount: number; highCount: number; mediumCount: number; findings: T[] }
) {
  const beforeKeys = new Set(before.findings.map(findingKey));
  const afterKeys = new Set(after.findings.map(findingKey));
  const resolved = before.findings.filter((finding) => !afterKeys.has(findingKey(finding)));
  const remaining = after.findings.filter((finding) => beforeKeys.has(findingKey(finding)));
  const introduced = after.findings.filter((finding) => !beforeKeys.has(findingKey(finding)));
  return {
    summary: {
      alertDelta: after.alertCount - before.alertCount,
      highDelta: after.highCount - before.highCount,
      mediumDelta: after.mediumCount - before.mediumCount,
      reductionRate:
        before.alertCount === 0
          ? 0
          : Math.max(0, (before.alertCount - after.alertCount) / before.alertCount),
      resolvedCount: resolved.length,
      remainingCount: remaining.length,
      introducedCount: introduced.length
    },
    resolved,
    remaining,
    introduced
  };
}

export async function compareSecurityScans(ruleId: string) {
  const before = await prisma.securityScanRun.findFirst({
    where: {
      ruleId,
      stage: SecurityScanStage.BEFORE_DEPLOYMENT,
      status: SecurityScanStatus.COMPLETED
    },
    include: { findings: true },
    orderBy: { completedAt: "desc" }
  });
  if (!before) {
    throw new AppError("완료된 배포 전 ZAP 스캔이 필요합니다.", 409, "SCAN_PAIR_INCOMPLETE");
  }
  const after = await prisma.securityScanRun.findFirst({
    where: {
      ruleId,
      stage: SecurityScanStage.AFTER_DEPLOYMENT,
      status: SecurityScanStatus.COMPLETED,
      completedAt: { gt: before.completedAt ?? before.createdAt }
    },
    include: { findings: true },
    orderBy: { completedAt: "desc" }
  });
  if (!after) {
    throw new AppError(
      "배포 전 스캔 이후에 완료된 배포 후 ZAP 스캔이 필요합니다.",
      409,
      "SCAN_PAIR_INCOMPLETE"
    );
  }
  const comparison = summarizeSecurityScanComparison(before, after);
  return {
    ruleId,
    before,
    after,
    ...comparison
  };
}

export async function getZapHealth() {
  if (!env.zapEnabled) return { enabled: false, available: false };
  try {
    const version = await zapRequest<{ version: string }>("core", "view", "version");
    return { enabled: true, available: true, version: version.version, target: env.zapTargetUrl };
  } catch (error) {
    return {
      enabled: true,
      available: false,
      target: env.zapTargetUrl,
      error: error instanceof Error ? error.message : "ZAP unavailable"
    };
  }
}
