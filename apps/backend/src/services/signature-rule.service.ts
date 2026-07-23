import {
  ApprovalDecision,
  DatasetKind,
  RuleStatus,
  SampleKind,
  SecurityScanStage,
  ValidationStatus
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { asJson } from "../utils/json.js";
import { generateAiExplanation } from "./ai.service.js";
import { generateReport } from "./report.service.js";
import {
  buildRuleDefinition,
  hashDefinition,
  makeExternalRuleId
} from "./rule-generator.service.js";
import { runValidation } from "./validation.service.js";
import { createSecurityScan } from "./security-scan.service.js";
import { exportModSecurityRule } from "./waf-export.service.js";
import { signatureDefinitionSchema } from "../schemas/signature.schema.js";

export async function listSignatureRules() {
  return prisma.signatureRule.findMany({
    include: {
      versions: { orderBy: { version: "desc" } },
      approvals: { orderBy: { createdAt: "desc" }, take: 1 },
      validationRuns: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getSignatureRule(id: string) {
  const rule = await prisma.signatureRule.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: "desc" } },
      approvals: { include: { user: { select: { id: true, name: true, email: true } } } },
      validationRuns: { include: { holdoutEvaluation: true }, orderBy: { createdAt: "desc" } },
      deployments: { include: { target: true }, orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  return rule;
}

export async function getSignatureRuleArtifact(id: string) {
  const rule = await getSignatureRule(id);
  const version = rule.versions.find((item) => item.version === rule.currentVersion);
  if (!version)
    throw new AppError("현재 룰 버전을 찾을 수 없습니다.", 409, "RULE_VERSION_NOT_FOUND");
  const definition = signatureDefinitionSchema.safeParse(version.definition);
  if (!definition.success) {
    throw new AppError("현재 룰 정의가 유효하지 않습니다.", 409, "INVALID_RULE_DEFINITION");
  }
  const mode = rule.status === RuleStatus.ACTIVE ? "active" : "shadow";
  return {
    ruleId: rule.id,
    externalId: rule.externalId,
    version: version.version,
    mode,
    modSecurityRule: exportModSecurityRule(definition.data, mode),
    artifactPath: rule.deployments[0]?.artifactPath ?? null,
    generatedAt: new Date()
  };
}

export async function getShadowMetrics(id: string) {
  const rule = await getSignatureRule(id);
  const version = rule.versions.find((item) => item.version === rule.currentVersion);
  if (!version)
    throw new AppError("현재 룰 버전을 찾을 수 없습니다.", 409, "RULE_VERSION_NOT_FOUND");
  const shadowDeployment = rule.deployments.find((item) => item.status === "SHADOW");
  if (!shadowDeployment) {
    throw new AppError("Shadow 배포 이력이 없습니다.", 409, "SHADOW_DEPLOYMENT_REQUIRED");
  }
  const observedFrom = shadowDeployment.deployedAt ?? shadowDeployment.createdAt;
  const baseWhere = {
    protectedServiceId: rule.protectedServiceId,
    occurredAt: { gte: observedFrom }
  } as const;
  const matchedWhere = {
    ...baseWhere,
    detections: { some: { ruleVersionId: version.id, matched: true } }
  } as const;
  const [observedRequests, matchedRequests, attackMatches, normalHits] = await Promise.all([
    prisma.requestEvent.count({ where: baseWhere }),
    prisma.requestEvent.count({ where: matchedWhere }),
    prisma.requestEvent.count({
      where: {
        ...baseWhere,
        AND: [
          { detections: { some: { ruleVersionId: version.id, matched: true } } },
          { detections: { some: { ruleVersionId: null, classification: "ATTACK" } } }
        ]
      }
    }),
    prisma.requestEvent.count({
      where: {
        ...baseWhere,
        AND: [
          { detections: { some: { ruleVersionId: version.id, matched: true } } },
          { detections: { some: { ruleVersionId: null, classification: "NORMAL" } } }
        ]
      }
    })
  ]);
  return {
    ruleId: rule.id,
    version: version.version,
    observedFrom,
    observedUntil: new Date(),
    observedRequests,
    matchedRequests,
    attackMatches,
    normalHits,
    estimatedFalsePositiveRate: matchedRequests === 0 ? 0 : normalHits / matchedRequests,
    activeRecommended: observedRequests > 0 && normalHits / Math.max(matchedRequests, 1) <= 0.1
  };
}

export async function generateRuleFromEvent(eventId: string) {
  const event = await prisma.requestEvent.findUnique({
    where: { id: eventId },
    include: { detections: true, replayPayload: true }
  });
  if (!event) throw new AppError("요청 이벤트를 찾을 수 없습니다.", 404, "REQUEST_EVENT_NOT_FOUND");
  const category = event.detections.find((item) => item.attackCategory)?.attackCategory;
  if (!category) {
    throw new AppError(
      "공격으로 분류된 요청에서만 룰을 생성할 수 있습니다.",
      409,
      "ATTACK_REQUIRED"
    );
  }

  const existing = await prisma.signatureRule.findFirst({ where: { sourceEventId: event.id } });
  if (existing) return getSignatureRule(existing.id);

  const sequence = (await prisma.signatureRule.count({ where: { category } })) + 1;
  const externalId = makeExternalRuleId(category, sequence);
  const definition = buildRuleDefinition(category, externalId);
  const aiDraft = await generateAiExplanation({
    task: "signature_rule_draft_explanation",
    category,
    externalId,
    detectionReasons: event.detections.map((item) => item.reasons)
  });

  const created = await prisma.$transaction(async (transaction) => {
    const rule = await transaction.signatureRule.create({
      data: {
        externalId,
        protectedServiceId: event.protectedServiceId,
        sourceEventId: event.id,
        category,
        status: RuleStatus.DRAFT,
        summary: aiDraft.text ?? `${category} 공격 요청에서 생성한 결정론적 조건 트리 룰`,
        versions: {
          create: {
            version: 1,
            definition: asJson(definition),
            note: "공격 이벤트 기반 초기 룰",
            definitionHash: hashDefinition(definition)
          }
        }
      }
    });

    const generationDataset = await transaction.dataset.upsert({
      where: {
        protectedServiceId_kind_name: {
          protectedServiceId: event.protectedServiceId,
          kind: DatasetKind.GENERATION,
          name: "generation-live"
        }
      },
      update: {},
      create: {
        protectedServiceId: event.protectedServiceId,
        kind: DatasetKind.GENERATION,
        name: "generation-live"
      }
    });
    if (event.replayPayload) {
      await transaction.datasetSample.create({
        data: {
          datasetId: generationDataset.id,
          requestEventId: event.id,
          kind: SampleKind.ATTACK,
          category,
          expectedAttack: true,
          payload: asJson({
            method: event.replayPayload.method,
            path: event.replayPayload.path,
            query: event.replayPayload.query,
            body: event.replayPayload.body
          })
        }
      });
    }
    return rule;
  });
  return getSignatureRule(created.id);
}

export async function validateSignatureRule(id: string) {
  const validation = await runValidation(id);
  const report = await generateReport(id, { reuseExisting: true });
  let securityScan = null;
  if (validation.status === ValidationStatus.PASSED && env.zapEnabled) {
    try {
      securityScan = await createSecurityScan({
        stage: SecurityScanStage.BEFORE_DEPLOYMENT,
        ruleId: id
      });
    } catch (error) {
      console.warn("Automatic pre-deployment ZAP scan could not be queued.", error);
    }
  }
  return { validation, report, securityScan };
}

export async function approveRule(id: string, userId: string, reason?: string) {
  const rule = await getSignatureRule(id);
  if (rule.status !== RuleStatus.APPROVAL_REQUIRED) {
    throw new AppError("shadow mode를 거친 룰만 승인할 수 있습니다.", 409, "INVALID_RULE_STATE");
  }
  return prisma.$transaction(async (transaction) => {
    await transaction.ruleApproval.create({
      data: { ruleId: id, userId, decision: ApprovalDecision.APPROVED, reason }
    });
    await transaction.auditLog.create({
      data: {
        userId,
        action: "RULE_APPROVED",
        resourceType: "SignatureRule",
        resourceId: id,
        metadata: {}
      }
    });
    return transaction.signatureRule.update({
      where: { id },
      data: { status: RuleStatus.APPROVED }
    });
  });
}

export async function requestRuleApproval(id: string, userId: string) {
  const rule = await getSignatureRule(id);
  if (rule.status !== RuleStatus.SHADOW_MODE) {
    throw new AppError(
      "Shadow mode를 거친 룰만 승인을 요청할 수 있습니다.",
      409,
      "INVALID_RULE_STATE"
    );
  }
  const latestValidation = rule.validationRuns[0];
  if (
    !latestValidation ||
    !rule.reports.some((report) => report.validationRunId === latestValidation.id)
  ) {
    throw new AppError("최신 검증 결과에 대한 AI 리포트가 필요합니다.", 409, "AI_REPORT_REQUIRED");
  }
  if (env.zapEnabled) {
    const shadowDeployment = rule.deployments.find((item) => item.status === "SHADOW");
    const shadowScan = await prisma.securityScanRun.findFirst({
      where: {
        ruleId: id,
        stage: SecurityScanStage.SHADOW_VERIFICATION,
        status: "COMPLETED",
        ...(shadowDeployment
          ? { completedAt: { gt: shadowDeployment.deployedAt ?? shadowDeployment.createdAt } }
          : {})
      },
      orderBy: { completedAt: "desc" }
    });
    if (!shadowScan) {
      throw new AppError(
        "Shadow 적용 후 완료된 ZAP 재검증이 필요합니다.",
        409,
        "SHADOW_SCAN_REQUIRED"
      );
    }
  }
  return prisma.$transaction(async (transaction) => {
    await transaction.auditLog.create({
      data: {
        userId,
        action: "RULE_APPROVAL_REQUESTED",
        resourceType: "SignatureRule",
        resourceId: id,
        metadata: {}
      }
    });
    return transaction.signatureRule.update({
      where: { id },
      data: { status: RuleStatus.APPROVAL_REQUIRED }
    });
  });
}

export async function rejectRule(id: string, userId: string, reason: string) {
  const rule = await getSignatureRule(id);
  if (rule.status !== RuleStatus.APPROVAL_REQUIRED) {
    throw new AppError("승인 대기 상태의 룰만 반려할 수 있습니다.", 409, "INVALID_RULE_STATE");
  }
  return prisma.$transaction(async (transaction) => {
    await transaction.ruleApproval.create({
      data: { ruleId: id, userId, decision: ApprovalDecision.REJECTED, reason }
    });
    await transaction.auditLog.create({
      data: {
        userId,
        action: "RULE_REJECTED",
        resourceType: "SignatureRule",
        resourceId: id,
        metadata: { reason }
      }
    });
    return transaction.signatureRule.update({
      where: { id },
      data: { status: RuleStatus.REJECTED }
    });
  });
}
