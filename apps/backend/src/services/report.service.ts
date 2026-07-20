import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { asJson } from "../utils/json.js";
import { generateAiExplanation } from "./ai.service.js";

export async function generateReport(ruleId: string) {
  const rule = await prisma.signatureRule.findUnique({
    where: { id: ruleId },
    include: {
      sourceEvent: { include: { sanitizedRequest: true, normalizedRequest: true } },
      validationRuns: {
        include: { holdoutEvaluation: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  const validation = rule.validationRuns[0];
  if (!validation) throw new AppError("먼저 룰 검증을 실행해 주세요.", 409, "VALIDATION_REQUIRED");

  const context = {
    ruleId: rule.externalId,
    category: rule.category,
    attackDetectionRate: validation.attackDetectionRate,
    falsePositiveRate: validation.falsePositiveRate,
    bypassSuccessRate: validation.bypassSuccessRate,
    confidence: validation.confidence,
    holdout: validation.holdoutEvaluation
  };
  const ai = await generateAiExplanation(context);
  const recommended = Boolean(
    validation.holdoutEvaluation?.passed && validation.falsePositiveRate <= 0.1
  );

  return prisma.aiReport.create({
    data: {
      ruleId: rule.id,
      validationRunId: validation.id,
      attackSummary:
        ai.text ?? `${rule.category} 요청에서 생성한 ${rule.externalId} 룰 검증 결과입니다.`,
      detectionEvidence: asJson([
        `공격 탐지율 ${(validation.attackDetectionRate * 100).toFixed(1)}%`,
        `정상 오탐률 ${(validation.falsePositiveRate * 100).toFixed(1)}%`,
        `우회 성공률 ${(validation.bypassSuccessRate * 100).toFixed(1)}%`
      ]),
      normalizationComparison: asJson({
        before: rule.sourceEvent?.sanitizedRequest?.bodyPreview ?? "",
        after: rule.sourceEvent?.normalizedRequest?.commentCollapsed ?? ""
      }),
      bypassResult: `우회 성공률 ${(validation.bypassSuccessRate * 100).toFixed(1)}%`,
      confidenceReason: `샌드박스 confidence ${(validation.confidence * 100).toFixed(1)}%`,
      operatorGuide: asJson([
        "shadow mode에서 실제 정상 트래픽 오탐을 확인합니다.",
        "holdout 결과와 매칭 근거를 검토합니다.",
        "승인 후 active 상태로 전환하고 rollback 지점을 유지합니다."
      ]),
      deploymentRecommendation: recommended ? "shadow mode 배포 권장" : "추가 검토 및 룰 보강 필요",
      provider: ai.provider
    }
  });
}
