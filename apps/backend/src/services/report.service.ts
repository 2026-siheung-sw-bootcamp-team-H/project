import { ValidationStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { asJson } from "../utils/json.js";
import { generateAiReportNarrative } from "./ai.service.js";

type GenerateReportOptions = {
  reuseExisting?: boolean;
};

export async function generateReport(ruleId: string, options: GenerateReportOptions = {}) {
  const rule = await prisma.signatureRule.findUnique({
    where: { id: ruleId },
    include: {
      sourceEvent: {
        include: { sanitizedRequest: true, normalizedRequest: true, detections: true }
      },
      versions: { orderBy: { version: "desc" } },
      validationRuns: {
        include: { holdoutEvaluation: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  const validation = rule.validationRuns[0];
  if (!validation) {
    throw new AppError("먼저 룰 검증을 실행해 주세요.", 409, "VALIDATION_REQUIRED");
  }
  if (
    validation.status !== ValidationStatus.PASSED &&
    validation.status !== ValidationStatus.FAILED
  ) {
    throw new AppError("완료된 룰 검증이 필요합니다.", 409, "VALIDATION_NOT_COMPLETED");
  }
  if (options.reuseExisting) {
    const existing = await prisma.aiReport.findFirst({
      where: { ruleId: rule.id, validationRunId: validation.id },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return existing;
  }

  const recommended = Boolean(
    validation.status === ValidationStatus.PASSED &&
      validation.holdoutEvaluation?.passed &&
      validation.falsePositiveRate <= 0.1 &&
      validation.bypassSuccessRate <= 0.1
  );
  const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const deterministicEvidence = [
    `공격 탐지율 ${percentage(validation.attackDetectionRate)}`,
    `정상 요청 오탐률 ${percentage(validation.falsePositiveRate)}`,
    `우회 성공률 ${percentage(validation.bypassSuccessRate)}`,
    `최종 신뢰도 ${percentage(validation.confidence)}`
  ];
  const deterministicRecommendation = recommended
    ? "관리자 승인 후 shadow mode 배포를 권장합니다."
    : "추가 검증 또는 룰 보강이 필요하므로 배포를 권장하지 않습니다.";
  const currentVersion = rule.versions.find((version) => version.version === rule.currentVersion);
  const ai = await generateAiReportNarrative({
    rule: {
      id: rule.externalId,
      category: rule.category,
      summary: rule.summary,
      currentVersion: rule.currentVersion,
      definition: currentVersion?.definition ?? null
    },
    sourceDetectionReasons: rule.sourceEvent?.detections.map((item) => item.reasons) ?? [],
    metrics: {
      attackDetectionRate: validation.attackDetectionRate,
      falsePositiveRate: validation.falsePositiveRate,
      bypassSuccessRate: validation.bypassSuccessRate,
      confidence: validation.confidence,
      validationStatus: validation.status,
      holdoutPassed: validation.holdoutEvaluation?.passed ?? false
    },
    adversarialRounds: validation.rounds,
    deterministicRecommendation: {
      recommended,
      message: deterministicRecommendation
    }
  });

  const fallbackGuide = recommended
    ? [
        "배포 전 ZAP 스캔 결과를 확인합니다.",
        "관리자 승인 후 shadow mode에서 정상 트래픽 오탐을 확인합니다.",
        "active 전환 후 ZAP 재검증 결과를 배포 전 결과와 비교합니다."
      ]
    : [
        "실패한 우회 전략과 오탐 샘플을 확인합니다.",
        "룰 조건을 보강한 뒤 Sandbox와 Holdout 검증을 다시 실행합니다.",
        "검증 기준을 통과하기 전에는 WAF에 배포하지 않습니다."
      ];

  return prisma.aiReport.create({
    data: {
      ruleId: rule.id,
      validationRunId: validation.id,
      attackSummary:
        ai.report?.attackSummary ??
        `${rule.category} 공격 요청을 기반으로 생성한 ${rule.externalId} 룰의 검증 결과입니다.`,
      detectionEvidence: asJson(ai.report?.detectionEvidence ?? deterministicEvidence),
      normalizationComparison: asJson({
        before: rule.sourceEvent?.sanitizedRequest?.bodyPreview ?? "",
        after: rule.sourceEvent?.normalizedRequest?.commentCollapsed ?? ""
      }),
      bypassResult:
        ai.report?.bypassResult ??
        `최종 우회 성공률은 ${percentage(validation.bypassSuccessRate)}입니다.`,
      confidenceReason:
        ai.report?.confidenceReason ??
        `탐지율과 오탐률을 결합한 검증 신뢰도는 ${percentage(validation.confidence)}입니다.`,
      operatorGuide: asJson(ai.report?.operatorGuide ?? fallbackGuide),
      deploymentRecommendation: ai.report?.deploymentRecommendation
        ? `${deterministicRecommendation} AI 설명: ${ai.report.deploymentRecommendation}`
        : deterministicRecommendation,
      provider: ai.provider
    }
  });
}
