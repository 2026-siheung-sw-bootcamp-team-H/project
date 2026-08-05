import { apiClient, ApiClientError } from "@/services/apiClient";
import type {
  AiReport,
  AiRuntimeStatus,
  AuditLog,
  AttackCategory,
  DashboardNextAction,
  Deployment,
  ProtectedService,
  PlatformSystemStatus,
  RequestLog,
  RuleArtifact,
  RuleStatus,
  SecurityScan,
  SecurityScanComparison,
  ShadowMetrics,
  SignatureDefinition,
  SignatureRule,
  TrafficClassification,
  ValidationRound,
  ValidationRun,
  ValidationSample
} from "@/types/domain";

type JsonRecord = Record<string, unknown>;

type BackendService = {
  id: string;
  slug: string;
  name: string;
  connection: string;
  status: string;
  apiUrl: string;
  publicDomain?: string | null;
  originUrl?: string | null;
  proxyUrl?: string | null;
  _count?: { requestEvents?: number; rules?: number; securityScans?: number };
  requestEvents?: Array<{ occurredAt: string }>;
};

type BackendRequestEvent = {
  id: string;
  occurredAt: string;
  method: string;
  path: string;
  ipFingerprint?: string | null;
  userAgent?: string | null;
  responseStatus?: number | null;
  sanitizedRequest?: {
    query?: unknown;
    bodyPreview?: string | null;
    headers?: unknown;
  } | null;
  normalizedRequest?: {
    commentCollapsed?: string;
    normalizedQuery?: string;
    normalizedBody?: string;
    tokens?: string[];
  } | null;
  detections?: Array<{
    classification: string;
    attackCategory?: string | null;
    matched?: boolean;
    reasons?: unknown;
  }>;
  enforcements?: Array<{
    action: string;
    source?: string | null;
    externalRuleId?: string | null;
    ruleMessage?: string | null;
    ruleTags?: string[];
    reason?: string | null;
  }>;
  source?: string;
  simulationId?: string | null;
};

type BackendSecurityScan = {
  id: string;
  protectedServiceId: string;
  ruleId?: string | null;
  deploymentId?: string | null;
  stage: string;
  status: string;
  progress: number;
  alertCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  informationalCount: number;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

type BackendRuleVersion = {
  version: number;
  definition: unknown;
  note: string;
  createdAt: string;
};

type BackendRule = {
  id: string;
  protectedServiceId: string;
  externalId: string;
  sourceEventId?: string | null;
  category: string;
  status: string;
  summary: string;
  currentVersion: number;
  confidence: number;
  falsePositiveRate: number;
  createdAt: string;
  versions?: BackendRuleVersion[];
  validationRuns?: BackendValidation[];
  deployments?: BackendDeployment[];
  reports?: BackendReport[];
};

type BackendValidation = {
  id: string;
  ruleId: string;
  status: string;
  attackDetectionRate: number;
  falsePositiveRate: number;
  bypassSuccessRate: number;
  confidence: number;
  rounds?: unknown;
  cases?: Array<{
    id: string;
    detected: boolean;
    expectedAttack: boolean;
    datasetSample: { kind: string; payload: unknown };
  }>;
  completedAt?: string | null;
  createdAt?: string;
  holdoutEvaluation?: {
    sampleCount: number;
    attackDetectionRate: number;
    falsePositiveRate: number;
    confidence: number;
    passed: boolean;
  } | null;
};

type BackendDeployment = {
  id: string;
  ruleId: string;
  status: string;
  deployedAt?: string | null;
  createdAt?: string;
  target?: { name: string; type: string };
  rule?: { externalId?: string };
  securityScan?: BackendSecurityScan | { scan: BackendSecurityScan; job: SecurityJob } | null;
};

type BackendReport = {
  id: string;
  ruleId: string;
  attackSummary: string;
  detectionEvidence: unknown;
  normalizationComparison: unknown;
  bypassResult: string;
  confidenceReason: string;
  operatorGuide: unknown;
  deploymentRecommendation: string;
  provider: string;
};

type BackendAuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: unknown;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
};

type SecurityJob = {
  jobId: string;
  status: string;
};

type JobStatus = {
  state: string;
  result?: { validationRunId?: string; reportId?: string } | null;
  failedReason?: string | null;
};

const defaultDefinition = (rule: BackendRule): SignatureDefinition => ({
  id: rule.externalId,
  version: rule.currentVersion,
  category: rule.category as AttackCategory,
  target: ["query", "body"],
  normalizers: ["url_decode", "unicode_normalize", "lowercase"],
  match: { operator: "all", conditions: [] },
  action: "monitor"
});

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapService(service: BackendService): ProtectedService {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    connection: service.connection,
    status: service.status.toLowerCase() as ProtectedService["status"],
    apiUrl: service.apiUrl,
    publicDomain: service.publicDomain ?? service.apiUrl,
    originUrl: service.originUrl ?? service.apiUrl,
    proxyUrl: service.proxyUrl ?? null,
    lastRequestAt: service.requestEvents?.[0]?.occurredAt ?? "",
    activeRuleCount: service._count?.rules ?? 0,
    scanCount: service._count?.securityScans ?? 0
  };
}

function mapSecurityScan(scan: BackendSecurityScan): SecurityScan {
  return {
    id: scan.id,
    protectedServiceId: scan.protectedServiceId,
    ruleId: scan.ruleId ?? null,
    deploymentId: scan.deploymentId ?? null,
    stage: scan.stage.toLowerCase() as SecurityScan["stage"],
    status: scan.status.toLowerCase() as SecurityScan["status"],
    progress: scan.progress,
    alertCount: scan.alertCount,
    highCount: scan.highCount,
    mediumCount: scan.mediumCount,
    lowCount: scan.lowCount,
    informationalCount: scan.informationalCount,
    errorMessage: scan.errorMessage ?? null,
    createdAt: scan.createdAt,
    startedAt: scan.startedAt ?? null,
    completedAt: scan.completedAt ?? null
  };
}

function buildRawRequest(event: BackendRequestEvent): string {
  const query = asRecord(event.sanitizedRequest?.query);
  const queryString = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : []
    )
  ).toString();
  const path = queryString ? `${event.path}?${queryString}` : event.path;
  const headers = asRecord(event.sanitizedRequest?.headers);
  const headerLines = Object.entries(headers)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n");
  const body = event.sanitizedRequest?.bodyPreview ?? "";
  return `${event.method} ${path} HTTP/1.1${headerLines ? `\n${headerLines}` : ""}${body ? `\n\n${body}` : ""}`;
}

function mapRequest(event: BackendRequestEvent): RequestLog {
  const attackDetection = event.detections?.find((item) => item.attackCategory);
  const detection = attackDetection ?? event.detections?.[0];
  const enforcement = event.enforcements?.[0];
  const internalAnvilActions = new Map(
    (event.enforcements ?? [])
      .filter((item) => item.source === "INTERNAL_RULE" && item.externalRuleId)
      .map((item) => [
        item.externalRuleId as string,
        item.action.toLowerCase() as "allow" | "monitor" | "block"
      ])
  );
  const enforcementAttributions = [
    ...new Map(
      (event.enforcements ?? [])
        .filter((item) => item.source && item.source !== "NONE")
        .map((item) => {
          const tags = (item.ruleTags ?? []).map((tag) => tag.toLowerCase());
          const message = item.ruleMessage ?? item.reason ?? null;
          const signatureId = message?.match(/\bSIG-[A-Z]+-\d+\b/i)?.[0]?.toUpperCase() ?? null;
          const isAnvil =
            tags.some((tag) => tag.includes("siheung-signature") || tag.includes("anvil")) ||
            item.source === "INTERNAL_RULE" ||
            Boolean(signatureId);
          const isCrs =
            item.source === "MODSECURITY" &&
            (tags.some((tag) => tag.includes("owasp") || tag.includes("crs")) ||
              /^9\d{5,}$/.test(item.externalRuleId ?? ""));
          const type = isAnvil
            ? ("anvil_signature" as const)
            : isCrs
              ? ("owasp_crs" as const)
              : item.source === "MODSECURITY"
                ? ("modsecurity" as const)
                : ("internal_rule" as const);
          const ruleId = signatureId ?? item.externalRuleId ?? null;
          const action =
            (isAnvil && ruleId ? internalAnvilActions.get(ruleId) : undefined) ??
            (item.action.toLowerCase() as "allow" | "monitor" | "block");
          return [
            `${type}:${ruleId ?? "unknown"}`,
            {
              type,
              action,
              ruleId,
              message
            }
          ] as const;
        })
    ).values()
  ];
  const normalized = event.normalizedRequest;
  return {
    id: event.id,
    occurredAt: event.occurredAt,
    method: event.method as RequestLog["method"],
    path: event.path,
    ip: event.ipFingerprint ?? "비식별 처리됨",
    userAgent: event.userAgent ?? "알 수 없음",
    classification: (detection?.classification?.toLowerCase() ??
      "unknown") as TrafficClassification,
    action:
      event.responseStatus === 403 || enforcement?.action?.toLowerCase() === "block"
        ? "blocked"
        : enforcement?.action?.toLowerCase() === "monitor"
          ? "monitored"
          : "allowed",
    attackCategory: (attackDetection?.attackCategory ?? null) as AttackCategory | null,
    rawRequest: buildRawRequest(event),
    normalizedRequest:
      normalized?.commentCollapsed ||
      [normalized?.normalizedQuery, normalized?.normalizedBody].filter(Boolean).join(" "),
    tokens: normalized?.tokens ?? [],
    statusCode: event.responseStatus ?? 0,
    detectionReasons: asStringArray(detection?.reasons),
    enforcementSource: enforcement?.source ?? "탐지 엔진",
    enforcementAttributions,
    source: (event.source?.toLowerCase() ?? "real") as RequestLog["source"],
    simulationId: event.simulationId ?? null
  };
}

function mapRule(rule: BackendRule): SignatureRule {
  const versions = rule.versions ?? [];
  const current = versions.find((item) => item.version === rule.currentVersion) ?? versions[0];
  const latestValidation = rule.validationRuns?.[0];
  const latestDeployment = rule.deployments?.[0];
  const latestReport = rule.reports?.[0];
  return {
    id: rule.id,
    protectedServiceId: rule.protectedServiceId,
    externalId: rule.externalId,
    sourceLogId: rule.sourceEventId ?? "",
    version: rule.currentVersion,
    category: rule.category as AttackCategory,
    status: rule.status.toLowerCase() as RuleStatus,
    confidence: rule.confidence,
    falsePositiveRate: rule.falsePositiveRate,
    createdAt: rule.createdAt,
    deploymentTarget: latestDeployment?.target?.name ?? "Nginx / ModSecurity",
    summary: rule.summary,
    definition: (current?.definition as SignatureDefinition | undefined) ?? defaultDefinition(rule),
    versionHistory: versions.map((version) => ({
      version: version.version,
      note: version.note,
      createdAt: version.createdAt
    })),
    validationRunId: latestValidation?.id,
    reportId: latestReport?.id
  };
}

function mapRound(value: unknown, index: number): ValidationRound {
  const round = asRecord(value);
  const baseline = asRecord(round.baseline);
  const proposals = Array.isArray(round.proposals) ? round.proposals.map(asRecord) : [];
  const accepted = proposals.find((proposal) => proposal.accepted === true);
  const metrics = accepted ? asRecord(accepted.metrics) : baseline;
  const generatedBy = asRecord(round.generatedBy);
  return {
    round: typeof round.round === "number" ? round.round : index + 1,
    strategy:
      Number(generatedBy.ai ?? 0) > 0 ? "AI + 결정론적 우회 테스트" : "결정론적 우회 테스트",
    detectionRate: Number(metrics.attackDetectionRate ?? 0),
    falsePositiveRate: Number(metrics.falsePositiveRate ?? 0),
    bypassSuccessRate: Number(metrics.bypassSuccessRate ?? 0),
    ruleChange: accepted ? `룰 버전 ${String(accepted.version)} 채택` : "현재 룰 유지"
  };
}

function mapSample(value: NonNullable<BackendValidation["cases"]>[number]): ValidationSample {
  const kind = value.datasetSample.kind.toLowerCase();
  return {
    id: value.id,
    kind: (kind === "normal"
      ? "normal"
      : kind === "bypass"
        ? "bypass"
        : "attack") as ValidationSample["kind"],
    input: JSON.stringify(value.datasetSample.payload),
    detected: value.detected,
    expected: value.expectedAttack
  };
}

function mapValidation(run: BackendValidation): ValidationRun {
  const rounds = Array.isArray(run.rounds) ? run.rounds.map(mapRound) : [];
  const firstRound =
    Array.isArray(run.rounds) && run.rounds.length > 0 ? asRecord(run.rounds[0]) : {};
  const initialMetrics = asRecord(firstRound.baseline);
  return {
    id: run.id,
    ruleId: run.ruleId,
    status: run.status.toLowerCase() as ValidationRun["status"],
    initialAttackDetectionRate: Number(
      initialMetrics.attackDetectionRate ?? run.attackDetectionRate
    ),
    initialBypassSuccessRate: Number(initialMetrics.bypassSuccessRate ?? run.bypassSuccessRate),
    attackDetectionRate: run.attackDetectionRate,
    falsePositiveRate: run.falsePositiveRate,
    bypassSuccessRate: run.bypassSuccessRate,
    confidence: run.confidence,
    rounds,
    samples: run.cases?.map(mapSample) ?? [],
    completedAt: run.completedAt ?? run.createdAt ?? new Date().toISOString(),
    holdout: run.holdoutEvaluation
      ? {
          sampleCount: run.holdoutEvaluation.sampleCount,
          attackDetectionRate: run.holdoutEvaluation.attackDetectionRate,
          falsePositiveRate: run.holdoutEvaluation.falsePositiveRate,
          confidence: run.holdoutEvaluation.confidence,
          passed: run.holdoutEvaluation.passed
        }
      : null
  };
}

function mapDeployment(deployment: BackendDeployment): Deployment {
  const targetType = deployment.target?.type;
  const target =
    targetType === "CLOUDFLARE"
      ? "Cloudflare Custom Rule"
      : targetType === "MODSECURITY"
        ? "Nginx / ModSecurity"
        : "Internal Signature Policy";
  const attachedScan =
    deployment.securityScan && "scan" in deployment.securityScan
      ? deployment.securityScan.scan
      : deployment.securityScan;
  return {
    id: deployment.id,
    ruleId: deployment.ruleId,
    ruleExternalId: deployment.rule?.externalId ?? deployment.ruleId,
    target,
    status: deployment.status.toLowerCase() as Deployment["status"],
    deployedAt: deployment.deployedAt ?? deployment.createdAt,
    securityScan: attachedScan ? mapSecurityScan(attachedScan) : null
  };
}

async function waitForJob(jobId: string): Promise<JobStatus> {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const job = await apiClient<JobStatus>(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (job.state === "completed") return job;
    if (job.state === "failed")
      throw new Error(job.failedReason ?? "백그라운드 작업에 실패했습니다.");
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
  throw new Error("작업 처리 시간이 초과되었습니다. 잠시 후 다시 확인해 주세요.");
}

function aggregateHourly(logs: RequestLog[]) {
  const buckets = new Map<
    string,
    { time: string; normal: number; attack: number; blocked: number }
  >();
  for (let offset = 4; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 60 * 60 * 1000);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    buckets.set(key, {
      time: `${String(date.getHours()).padStart(2, "0")}:00`,
      normal: 0,
      attack: 0,
      blocked: 0
    });
  }
  logs.forEach((log) => {
    const date = new Date(log.occurredAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    const bucket = buckets.get(key);
    if (!bucket) return;
    if (log.classification === "attack" || log.classification === "suspicious") bucket.attack += 1;
    else bucket.normal += 1;
    if (log.action === "blocked") bucket.blocked += 1;
  });
  return [...buckets.values()];
}

const dashboardNextActions: DashboardNextAction[] = [
  "REGISTER_SERVICE",
  "TEST_CONNECTION",
  "RUN_INITIAL_SCAN",
  "REVIEW_ATTACK_EVENTS",
  "VALIDATE_RULE",
  "REVIEW_AI_REPORT",
  "REVIEW_SHADOW",
  "APPROVE_RULE",
  "DEPLOY_ACTIVE",
  "VIEW_PROTECTION_RESULT",
  "REVIEW_RULE"
];

function isDashboardNextAction(value: unknown): value is DashboardNextAction {
  return dashboardNextActions.includes(value as DashboardNextAction);
}

function deriveDashboardNextAction(
  service: ProtectedService | null,
  initialScan: SecurityScan | null,
  latestRule: SignatureRule | null
): DashboardNextAction {
  if (!service) return "REGISTER_SERVICE";
  if (service.status !== "connected") return "TEST_CONNECTION";
  if (!initialScan) return "RUN_INITIAL_SCAN";
  if (!latestRule) return "REVIEW_ATTACK_EVENTS";
  if (["draft", "review_required"].includes(latestRule.status)) return "VALIDATE_RULE";
  if (latestRule.status === "holdout_passed") return "REVIEW_AI_REPORT";
  if (latestRule.status === "shadow_mode") return "REVIEW_SHADOW";
  if (latestRule.status === "approval_required") return "APPROVE_RULE";
  if (latestRule.status === "approved") return "DEPLOY_ACTIVE";
  if (latestRule.status === "active") return "VIEW_PROTECTION_RESULT";
  return "REVIEW_RULE";
}

export const platformApi = {
  login(email: string, password: string) {
    return apiClient<{ token: string; name: string; email: string; expiresIn: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } }
    );
  },

  async getServices() {
    return (await apiClient<BackendService[]>("/api/protected-services")).map(mapService);
  },

  async getService() {
    const services = await platformApi.getServices();
    if (!services[0]) throw new Error("등록된 보호 서비스가 없습니다.");
    return services[0];
  },

  async createService(input: {
    name: string;
    publicDomain: string;
    originUrl: string;
    proxyUrl?: string;
    connection?: string;
  }) {
    return mapService(
      await apiClient<BackendService>("/api/protected-services", {
        method: "POST",
        body: input
      })
    );
  },

  async updateServiceStatus(id: string, status: "PENDING" | "DISABLED") {
    return mapService(
      await apiClient<BackendService>(`/api/protected-services/${id}`, {
        method: "PATCH",
        body: { status }
      })
    );
  },

  testServiceConnection(id: string) {
    return apiClient<{
      serviceId: string;
      connected: boolean;
      target: string;
      statusCode: number | null;
      latencyMs: number;
      receivedBytes: number;
      checkedAt: string;
      errorMessage: string | null;
    }>(`/api/protected-services/${id}/connection-test`, { method: "POST" });
  },

  async resumeService(id: string) {
    await platformApi.updateServiceStatus(id, "PENDING");
    return platformApi.testServiceConnection(id);
  },

  async startInitialScan(serviceId: string) {
    const result = await apiClient<{ scan: BackendSecurityScan; job: SecurityJob }>(
      "/api/security-scans",
      {
        method: "POST",
        body: { stage: "INITIAL_SCAN", protectedServiceId: serviceId }
      }
    );
    return { scan: mapSecurityScan(result.scan), job: result.job };
  },

  async startSecurityScan(input: {
    stage:
      | "INITIAL_SCAN"
      | "BEFORE_DEPLOYMENT"
      | "SHADOW_VERIFICATION"
      | "AFTER_DEPLOYMENT"
      | "AD_HOC";
    protectedServiceId?: string;
    ruleId?: string;
    deploymentId?: string;
  }) {
    const result = await apiClient<{ scan: BackendSecurityScan; job: SecurityJob }>(
      "/api/security-scans",
      { method: "POST", body: input }
    );
    return { scan: mapSecurityScan(result.scan), job: result.job };
  },

  async getSecurityScans(serviceId?: string) {
    const query = serviceId ? `?protectedServiceId=${encodeURIComponent(serviceId)}` : "";
    return (await apiClient<BackendSecurityScan[]>(`/api/security-scans${query}`)).map(
      mapSecurityScan
    );
  },

  async getSecurityScan(id: string) {
    return mapSecurityScan(await apiClient<BackendSecurityScan>(`/api/security-scans/${id}`));
  },

  async getSecurityScanComparison(ruleId: string): Promise<SecurityScanComparison> {
    const result = await apiClient<{
      ruleId: string;
      before: BackendSecurityScan;
      after: BackendSecurityScan;
      summary: SecurityScanComparison["summary"];
    }>(`/api/security-scans/compare?ruleId=${encodeURIComponent(ruleId)}`);
    return {
      ruleId: result.ruleId,
      before: mapSecurityScan(result.before),
      after: mapSecurityScan(result.after),
      summary: result.summary
    };
  },

  getAiStatus() {
    return apiClient<AiRuntimeStatus>("/api/ai/status");
  },

  async getSystemStatus(): Promise<PlatformSystemStatus> {
    const [backend, zap, search, ai] = await Promise.allSettled([
      apiClient<{ status: string; service: string }>("/api/health"),
      apiClient<{ enabled: boolean; available: boolean; version?: string | null }>(
        "/api/security-scans/health"
      ),
      apiClient<{ enabled: boolean; available: boolean; mode: string }>(
        "/api/request-events/search/health"
      ),
      platformApi.getAiStatus()
    ]);
    return {
      checkedAt: new Date().toISOString(),
      backend: {
        available: backend.status === "fulfilled" && backend.value.status === "ok",
        detail: backend.status === "fulfilled" ? backend.value.service : "응답 없음"
      },
      zap: {
        available: zap.status === "fulfilled" && zap.value.available,
        detail:
          zap.status === "fulfilled"
            ? zap.value.available
              ? `ZAP ${zap.value.version ?? "연결됨"}`
              : "연결 확인 필요"
            : "응답 없음"
      },
      search: {
        available: search.status === "fulfilled" && search.value.available,
        detail:
          search.status === "fulfilled" && search.value.available
            ? search.value.mode === "opensearch"
              ? "OpenSearch 연결됨"
              : search.value.mode
            : "연결 확인 필요"
      },
      ai: {
        available: ai.status === "fulfilled",
        configured: ai.status === "fulfilled" && Boolean(ai.value.enabled && ai.value.configured),
        detail:
          ai.status === "fulfilled" && ai.value.enabled && ai.value.configured
            ? `${ai.value.provider} · ${ai.value.model ?? "기본 모델"}`
            : ai.status === "fulfilled"
              ? "기본 검증 모드"
              : "상태 확인 실패"
      }
    };
  },

  getShadowMetrics(id: string) {
    return apiClient<ShadowMetrics>(`/api/signature-rules/${id}/shadow-metrics`);
  },

  getRuleArtifact(id: string) {
    return apiClient<RuleArtifact>(`/api/signature-rules/${id}/artifact`);
  },

  async getLogs(serviceId?: string): Promise<RequestLog[]> {
    const params = new URLSearchParams({ limit: "100" });
    if (serviceId) params.set("protectedServiceId", serviceId);
    return (await apiClient<BackendRequestEvent[]>(`/api/request-events?${params.toString()}`)).map(
      mapRequest
    );
  },

  async getLog(id: string): Promise<RequestLog> {
    return mapRequest(await apiClient<BackendRequestEvent>(`/api/request-events/${id}`));
  },

  async normalizeLog(id: string) {
    await apiClient(`/api/request-events/${id}/normalize`, { method: "POST" });
    return platformApi.getLog(id);
  },

  async getRules(serviceId?: string): Promise<SignatureRule[]> {
    const rules = (await apiClient<BackendRule[]>("/api/signature-rules")).map(mapRule);
    return serviceId ? rules.filter((rule) => rule.protectedServiceId === serviceId) : rules;
  },

  async getRule(id: string): Promise<SignatureRule> {
    return mapRule(await apiClient<BackendRule>(`/api/signature-rules/${id}`));
  },

  async generateRule(logId: string): Promise<SignatureRule> {
    return mapRule(
      await apiClient<BackendRule>("/api/signature-rules/generate", {
        method: "POST",
        body: { requestEventId: logId }
      })
    );
  },

  async validateRule(ruleId: string): Promise<ValidationRun> {
    const response = await apiClient<BackendValidation | SecurityJob>(
      `/api/signature-rules/${ruleId}/validate`,
      { method: "POST" }
    );
    if ("jobId" in response) {
      const job = await waitForJob(response.jobId);
      const validationId = job.result?.validationRunId;
      if (!validationId) throw new Error("검증 결과 ID를 받지 못했습니다.");
      return platformApi.getValidation(validationId);
    }
    return mapValidation(response);
  },

  async getValidation(id: string): Promise<ValidationRun> {
    return mapValidation(await apiClient<BackendValidation>(`/api/validation-runs/${id}`));
  },

  async requestApproval(id: string) {
    return mapRule(
      await apiClient<BackendRule>(`/api/signature-rules/${id}/request-approval`, {
        method: "POST"
      })
    );
  },

  async approveRule(id: string, reason?: string) {
    return mapRule(
      await apiClient<BackendRule>(`/api/signature-rules/${id}/approve`, {
        method: "POST",
        body: { reason }
      })
    );
  },

  async rejectRule(id: string, reason: string) {
    return mapRule(
      await apiClient<BackendRule>(`/api/signature-rules/${id}/reject`, {
        method: "POST",
        body: { reason }
      })
    );
  },

  async deployRule(
    id: string,
    mode: "shadow" | "active" | "rollback",
    targetType: "INTERNAL" | "MODSECURITY" | "CLOUDFLARE" = "MODSECURITY"
  ) {
    return mapDeployment(
      await apiClient<BackendDeployment>(`/api/signature-rules/${id}/deploy`, {
        method: "POST",
        body: { mode, targetType }
      })
    );
  },

  async getDeployments(serviceId?: string): Promise<Deployment[]> {
    const deployments = (await apiClient<BackendDeployment[]>("/api/deployments")).map(
      mapDeployment
    );
    if (!serviceId) return deployments;
    const ruleIds = new Set((await platformApi.getRules(serviceId)).map((rule) => rule.id));
    return deployments.filter((deployment) => ruleIds.has(deployment.ruleId));
  },

  async getAuditLogs(limit = 10): Promise<AuditLog[]> {
    const logs = await apiClient<BackendAuditLog[]>(`/api/audit-logs?limit=${limit}`);
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      metadata: asRecord(log.metadata),
      createdAt: log.createdAt,
      user: log.user ?? null
    }));
  },

  async getReport(ruleId: string): Promise<AiReport> {
    const rawRule = await apiClient<BackendRule>(`/api/signature-rules/${ruleId}`);
    const rule = mapRule(rawRule);
    const validationId = rule.validationRunId;
    if (!validationId) throw new Error("먼저 룰 검증을 실행해 주세요.");
    const backendReport = rawRule.reports?.[0];
    if (backendReport) {
      const normalization = asRecord(backendReport.normalizationComparison);
      return {
        id: backendReport.id,
        ruleId: rule.id,
        attackSummary: backendReport.attackSummary,
        detectionEvidence: asStringArray(backendReport.detectionEvidence),
        normalizationComparison: {
          before: String(normalization.before ?? ""),
          after: String(normalization.after ?? "")
        },
        bypassResult: backendReport.bypassResult,
        confidenceReason: backendReport.confidenceReason,
        operatorGuide: asStringArray(backendReport.operatorGuide),
        deploymentRecommendation: backendReport.deploymentRecommendation,
        provider: backendReport.provider
      };
    }
    throw new Error("백엔드에 저장된 검증 리포트가 없습니다. 룰 검증을 다시 실행해 주세요.");
  },

  async getDashboard(serviceId?: string) {
    const dashboard = await apiClient<{
      service: BackendService | null;
      requestCount: number;
      blockedCount: number;
      activeRuleCount: number;
      averageConfidence: number;
      latestValidation?: BackendValidation | null;
      initialScan?: BackendSecurityScan | null;
      latestRule?: BackendRule | null;
      nextAction?: unknown;
    }>(serviceId ? `/api/dashboard?serviceId=${encodeURIComponent(serviceId)}` : "/api/dashboard");
    const service = dashboard.service ? mapService(dashboard.service) : null;
    const [logs, allRules, allDeployments, scans] = await Promise.all([
      platformApi.getLogs(service?.id),
      platformApi.getRules(service?.id),
      platformApi.getDeployments(service?.id),
      service ? platformApi.getSecurityScans(service.id) : Promise.resolve([])
    ]);
    const rules = service ? allRules.filter((rule) => rule.protectedServiceId === service.id) : [];
    const ruleIds = new Set(rules.map((rule) => rule.id));
    const deployments = allDeployments.filter((deployment) => ruleIds.has(deployment.ruleId));
    const initialScan = dashboard.initialScan
      ? mapSecurityScan(dashboard.initialScan)
      : (scans.find((scan) => scan.stage === "initial_scan" && scan.status === "completed") ??
        null);
    const latestRule = dashboard.latestRule ? mapRule(dashboard.latestRule) : (rules[0] ?? null);
    const nextAction = isDashboardNextAction(dashboard.nextAction)
      ? dashboard.nextAction
      : deriveDashboardNextAction(service, initialScan, latestRule);
    const riskLogs = logs.filter((log) => ["attack", "suspicious"].includes(log.classification));
    const securityDecisionDistribution = [
      {
        name: "정상",
        value: logs.filter((log) => log.classification === "normal").length,
        color: "#94a3b8"
      },
      {
        name: "의심",
        value: logs.filter((log) => log.classification === "suspicious").length,
        color: "#f59e0b"
      },
      {
        name: "공격",
        value: logs.filter((log) => log.classification === "attack").length,
        color: "#fb7185"
      },
      {
        name: "미분류",
        value: logs.filter((log) => log.classification === "unknown").length,
        color: "#475569"
      }
    ].filter((item) => item.value > 0);
    const enforcementActionDistribution = [
      {
        name: "허용",
        value: logs.filter((log) => log.action === "allowed").length,
        color: "#94a3b8"
      },
      {
        name: "관찰",
        value: logs.filter((log) => log.action === "monitored").length,
        color: "#a78bfa"
      },
      {
        name: "차단",
        value: logs.filter((log) => log.action === "blocked").length,
        color: "#2dd4bf"
      }
    ].filter((item) => item.value > 0);
    return {
      service,
      requestCount: dashboard.requestCount,
      blockedCount: dashboard.blockedCount,
      activeRuleCount: dashboard.activeRuleCount,
      averageConfidence: dashboard.averageConfidence,
      nextAction,
      initialScan,
      latestScan: scans[0] ?? null,
      latestRule,
      suspiciousCount: riskLogs.length,
      averageDetectionRate:
        rules.filter((rule) => rule.validationRunId).length > 0
          ? rules
              .filter((rule) => rule.validationRunId)
              .reduce((sum, rule) => sum + rule.confidence, 0) /
            rules.filter((rule) => rule.validationRunId).length
          : 0,
      averageFalsePositiveRate:
        rules.length > 0
          ? rules.reduce((sum, rule) => sum + rule.falsePositiveRate, 0) / rules.length
          : 0,
      shadowRuleCount: rules.filter((rule) => rule.status === "shadow_mode").length,
      deploymentCount: deployments.length,
      latestValidation: dashboard.latestValidation
        ? mapValidation(dashboard.latestValidation)
        : null,
      hourlyRequests: aggregateHourly(logs),
      securityDecisionDistribution,
      enforcementActionDistribution,
      recentLogs: riskLogs.slice(0, 5)
    };
  },

  isApiError(error: unknown): error is ApiClientError {
    return error instanceof ApiClientError;
  }
};
