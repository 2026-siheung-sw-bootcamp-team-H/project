import {
  DeploymentStatus,
  DeploymentTargetType,
  RuleStatus,
  SecurityScanStage,
  SecurityScanStatus,
  type DeploymentTarget
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { createSecurityScan } from "./security-scan.service.js";
import { rebuildModSecurityArtifact, waitForModSecurityReload } from "./waf-export.service.js";

export type DeploymentMode = "shadow" | "active" | "rollback";

async function getTarget(serviceId: string, type: DeploymentTargetType): Promise<DeploymentTarget> {
  const target = await prisma.deploymentTarget.findFirst({
    where: { protectedServiceId: serviceId, type, enabled: true }
  });
  if (!target) {
    throw new AppError("활성 배포 대상을 찾을 수 없습니다.", 409, "DEPLOYMENT_TARGET_NOT_FOUND");
  }
  return target;
}

export async function deployRule(
  ruleId: string,
  mode: DeploymentMode,
  targetType: DeploymentTargetType,
  userId: string
) {
  const rule = await prisma.signatureRule.findUnique({
    where: { id: ruleId },
    include: { versions: true, reports: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  const currentVersion = rule.versions.find((item) => item.version === rule.currentVersion);
  if (!currentVersion) {
    throw new AppError("현재 룰 버전을 찾을 수 없습니다.", 409, "RULE_VERSION_NOT_FOUND");
  }
  const target = await getTarget(rule.protectedServiceId, targetType);
  const previousDeployment =
    mode === "rollback"
      ? await prisma.deploymentHistory.findFirst({
          where: {
            ruleId: rule.id,
            targetId: target.id,
            status: DeploymentStatus.DEPLOYED,
            ruleVersionId: { not: currentVersion.id }
          },
          include: { ruleVersion: true },
          orderBy: { createdAt: "desc" }
        })
      : null;

  if (mode === "shadow" && rule.status !== RuleStatus.HOLDOUT_PASSED) {
    throw new AppError(
      "Holdout 검증을 통과하고 AI 리포트가 생성된 룰만 shadow mode로 배포할 수 있습니다.",
      409,
      "VALIDATION_REQUIRED"
    );
  }
  if (mode === "shadow" && !rule.reports[0]) {
    throw new AppError("Shadow 배포 전에 AI 리포트가 필요합니다.", 409, "AI_REPORT_REQUIRED");
  }
  if (mode === "active" && rule.status !== RuleStatus.APPROVED) {
    throw new AppError(
      "Shadow 관찰 후 관리자의 최종 승인을 받은 룰만 active로 전환할 수 있습니다.",
      409,
      "APPROVAL_REQUIRED"
    );
  }
  if (mode === "rollback" && rule.status !== RuleStatus.ACTIVE) {
    throw new AppError("활성 룰만 rollback할 수 있습니다.", 409, "INVALID_RULE_STATE");
  }
  if (mode === "shadow" && targetType === DeploymentTargetType.MODSECURITY && env.zapEnabled) {
    const latestReport = rule.reports[0];
    const beforeScan = await prisma.securityScanRun.findFirst({
      where: {
        ruleId: rule.id,
        stage: SecurityScanStage.BEFORE_DEPLOYMENT,
        status: SecurityScanStatus.COMPLETED,
        completedAt: { gt: latestReport.createdAt }
      },
      orderBy: { completedAt: "desc" }
    });
    if (!beforeScan) {
      throw new AppError(
        "최신 AI 리포트 이후 완료된 배포 전 ZAP 스캔이 필요합니다.",
        409,
        "BEFORE_DEPLOYMENT_SCAN_REQUIRED"
      );
    }
  }

  const deploymentVersion = previousDeployment?.ruleVersion ?? currentVersion;
  const nextRuleStatus =
    mode === "shadow"
      ? RuleStatus.SHADOW_MODE
      : mode === "active" || previousDeployment
        ? RuleStatus.ACTIVE
        : RuleStatus.ROLLED_BACK;
  const deploymentStatus =
    mode === "shadow"
      ? DeploymentStatus.SHADOW
      : mode === "active"
        ? DeploymentStatus.DEPLOYED
        : DeploymentStatus.ROLLED_BACK;

  await prisma.signatureRule.update({
    where: { id: rule.id },
    data: { status: nextRuleStatus, currentVersion: deploymentVersion.version }
  });

  let artifactPath: string | undefined;
  let deployment;
  try {
    if (targetType === DeploymentTargetType.MODSECURITY) {
      artifactPath = await rebuildModSecurityArtifact();
      await waitForModSecurityReload();
    }
    deployment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.deploymentHistory.create({
        data: {
          ruleId: rule.id,
          ruleVersionId: deploymentVersion.id,
          targetId: target.id,
          status: deploymentStatus,
          artifactPath,
          deployedBy: userId,
          deployedAt: mode === "rollback" ? null : new Date(),
          rolledBackAt: mode === "rollback" ? new Date() : null
        },
        include: { target: true }
      });
      await transaction.auditLog.create({
        data: {
          userId,
          action: `RULE_${mode.toUpperCase()}`,
          resourceType: "SignatureRule",
          resourceId: rule.id,
          metadata: { targetType, artifactPath: artifactPath ?? null }
        }
      });
      return created;
    });
  } catch (error) {
    await prisma.signatureRule.update({
      where: { id: rule.id },
      data: { status: rule.status, currentVersion: rule.currentVersion }
    });
    await prisma.deploymentHistory.create({
      data: {
        ruleId: rule.id,
        ruleVersionId: deploymentVersion.id,
        targetId: target.id,
        status: DeploymentStatus.FAILED,
        deployedBy: userId,
        errorMessage: error instanceof Error ? error.message : "Unknown deployment error"
      }
    });
    throw error;
  }

  let securityScan = null;
  if (
    ["shadow", "active"].includes(mode) &&
    targetType === DeploymentTargetType.MODSECURITY &&
    env.zapEnabled
  ) {
    try {
      securityScan = await createSecurityScan({
        stage:
          mode === "shadow"
            ? SecurityScanStage.SHADOW_VERIFICATION
            : SecurityScanStage.AFTER_DEPLOYMENT,
        ruleId: rule.id,
        deploymentId: deployment.id
      });
    } catch (error) {
      console.warn("Automatic post-deployment ZAP scan could not be queued.", error);
    }
  }
  return { ...deployment, securityScan };
}

export async function listDeployments() {
  return prisma.deploymentHistory.findMany({
    include: { rule: true, ruleVersion: true, target: true, securityScans: true },
    orderBy: { createdAt: "desc" }
  });
}
