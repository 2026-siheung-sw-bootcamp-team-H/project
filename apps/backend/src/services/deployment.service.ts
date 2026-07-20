import {
  DeploymentStatus,
  DeploymentTargetType,
  RuleStatus,
  type DeploymentTarget
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { rebuildModSecurityArtifact, waitForModSecurityReload } from "./waf-export.service.js";

export type DeploymentMode = "shadow" | "active" | "rollback";

async function getTarget(serviceId: string, type: DeploymentTargetType): Promise<DeploymentTarget> {
  const target = await prisma.deploymentTarget.findFirst({
    where: { protectedServiceId: serviceId, type, enabled: true }
  });
  if (!target)
    throw new AppError("활성 배포 대상을 찾을 수 없습니다.", 409, "DEPLOYMENT_TARGET_NOT_FOUND");
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
    include: { versions: true }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  const version = rule.versions.find((item) => item.version === rule.currentVersion);
  if (!version)
    throw new AppError("현재 룰 버전을 찾을 수 없습니다.", 409, "RULE_VERSION_NOT_FOUND");
  const target = await getTarget(rule.protectedServiceId, targetType);
  const previousDeployment =
    mode === "rollback"
      ? await prisma.deploymentHistory.findFirst({
          where: {
            ruleId: rule.id,
            targetId: target.id,
            status: DeploymentStatus.DEPLOYED,
            ruleVersionId: { not: version.id }
          },
          include: { ruleVersion: true },
          orderBy: { createdAt: "desc" }
        })
      : null;

  if (mode === "shadow" && rule.status !== RuleStatus.HOLDOUT_PASSED) {
    throw new AppError(
      "holdout 평가를 통과한 룰만 shadow mode로 배포할 수 있습니다.",
      409,
      "INVALID_RULE_STATE"
    );
  }
  if (mode === "active" && rule.status !== RuleStatus.APPROVED) {
    throw new AppError("관리자 승인을 받은 룰만 활성화할 수 있습니다.", 409, "APPROVAL_REQUIRED");
  }
  if (mode === "rollback" && rule.status !== RuleStatus.ACTIVE) {
    throw new AppError("활성 룰만 rollback할 수 있습니다.", 409, "INVALID_RULE_STATE");
  }

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
    data: {
      status: nextRuleStatus,
      currentVersion: previousDeployment?.ruleVersion.version ?? rule.currentVersion
    }
  });
  let artifactPath: string | undefined;
  try {
    if (targetType === DeploymentTargetType.MODSECURITY) {
      artifactPath = await rebuildModSecurityArtifact();
      await waitForModSecurityReload();
    }
    return await prisma.$transaction(async (transaction) => {
      const deployment = await transaction.deploymentHistory.create({
        data: {
          ruleId: rule.id,
          ruleVersionId: version.id,
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
      return deployment;
    });
  } catch (error) {
    await prisma.signatureRule.update({
      where: { id: rule.id },
      data: { status: rule.status, currentVersion: rule.currentVersion }
    });
    await prisma.deploymentHistory.create({
      data: {
        ruleId: rule.id,
        ruleVersionId: version.id,
        targetId: target.id,
        status: DeploymentStatus.FAILED,
        deployedBy: userId,
        errorMessage: error instanceof Error ? error.message : "Unknown deployment error"
      }
    });
    throw error;
  }
}

export async function listDeployments() {
  return prisma.deploymentHistory.findMany({
    include: { rule: true, ruleVersion: true, target: true },
    orderBy: { createdAt: "desc" }
  });
}
