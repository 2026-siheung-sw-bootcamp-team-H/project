import { DatasetKind, RuleStatus, ValidationStatus, type DatasetSample } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import {
  assertSafeDefinition,
  signatureDefinitionSchema,
  type SignatureDefinition
} from "../schemas/signature.schema.js";
import { AppError } from "../utils/app-error.js";
import { asJson, asRecord } from "../utils/json.js";
import { generateAdversarialVariants, type AdversarialSample } from "./adversarial.service.js";
import { proposeAiAdversarialSamples, proposeAiRuleRefinement } from "./ai.service.js";
import { hashDatasetSamples } from "./dataset-integrity.service.js";
import { normalizePayload } from "./normalizer.service.js";
import { buildDeterministicRefinement, shouldAdoptCandidate } from "./refinement.service.js";
import { hashDefinition } from "./rule-generator.service.js";
import { evaluateSignature } from "./signature-detector.service.js";

type EvaluatedDatasetSample = {
  sample: DatasetSample;
  detected: boolean;
  reasons: string[];
  latencyMs: number;
};

type ValidationMetrics = {
  attackDetectionRate: number;
  falsePositiveRate: number;
  confidence: number;
  averageLatencyMs: number;
};

type CandidateEvaluation = {
  definition: SignatureDefinition;
  provider: string;
  rationale: string;
  metrics: ValidationMetrics & { bypassSuccessRate: number };
};

function extractPayload(sample: DatasetSample) {
  const payload = asRecord(sample.payload);
  return {
    query: asRecord(payload.query),
    body: payload.body ?? {},
    path: typeof payload.path === "string" ? payload.path : "",
    headers: asRecord(payload.headers)
  };
}

function evaluateSample(definition: SignatureDefinition, sample: DatasetSample) {
  const payload = extractPayload(sample);
  const startedAt = performance.now();
  const normalized = normalizePayload(payload.query, payload.body, payload.path, payload.headers);
  const result = evaluateSignature(definition, normalized);
  return {
    detected: result.matched,
    reasons: result.reasons,
    latencyMs: performance.now() - startedAt
  };
}

function calculateMetrics(results: EvaluatedDatasetSample[]): ValidationMetrics {
  const attacks = results.filter(({ sample }) => sample.expectedAttack);
  const normals = results.filter(({ sample }) => !sample.expectedAttack);
  const attackDetectionRate =
    attacks.length === 0 ? 0 : attacks.filter((result) => result.detected).length / attacks.length;
  const falsePositiveRate =
    normals.length === 0 ? 0 : normals.filter((result) => result.detected).length / normals.length;
  return {
    attackDetectionRate,
    falsePositiveRate,
    confidence: attackDetectionRate * (1 - falsePositiveRate),
    averageLatencyMs:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length
  };
}

function evaluateDataset(definition: SignatureDefinition, samples: DatasetSample[]) {
  const results = samples.map((sample) => ({ sample, ...evaluateSample(definition, sample) }));
  return { results, metrics: calculateMetrics(results) };
}

function findPrimaryValue(sample: DatasetSample): string {
  const payload = extractPayload(sample);
  const values = [
    ...Object.values(payload.query),
    ...Object.values(asRecord(payload.body)),
    payload.path
  ];
  const value = values.find((item) => typeof item === "string" && item.length > 0);
  return typeof value === "string" ? value : "";
}

function buildAdversarialSet(
  samples: DatasetSample[],
  category: DatasetSample["category"],
  round: number
): AdversarialSample[] {
  if (!category) return [];
  return samples
    .filter((sample) => sample.expectedAttack && sample.category === category)
    .flatMap((sample) => generateAdversarialVariants(findPrimaryValue(sample), category, round))
    .filter((sample, index, all) => all.findIndex((item) => item.value === sample.value) === index)
    .slice(0, 100);
}

function mergeAdversarialSamples(...sets: AdversarialSample[][]): AdversarialSample[] {
  return sets
    .flat()
    .filter((sample, index, all) => all.findIndex((item) => item.value === sample.value) === index)
    .slice(0, 200);
}

function evaluateAdversarial(definition: SignatureDefinition, samples: AdversarialSample[]) {
  const results = samples.map((sample) => {
    const startedAt = performance.now();
    const detected = evaluateSignature(
      definition,
      normalizePayload({ q: sample.value }, {})
    ).matched;
    return { ...sample, detected, latencyMs: performance.now() - startedAt };
  });
  return {
    results,
    bypassSuccessRate:
      results.length === 0
        ? 0
        : results.filter((result) => !result.detected).length / results.length,
    averageLatencyMs:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length
  };
}

async function buildCandidates(input: {
  current: SignatureDefinition;
  nextVersion: number;
  bypasses: AdversarialSample[];
  metrics: ValidationMetrics & { bypassSuccessRate: number };
}): Promise<Array<{ definition: SignatureDefinition; provider: string; rationale: string }>> {
  const candidates: Array<{
    definition: SignatureDefinition;
    provider: string;
    rationale: string;
  }> = [];
  const ai = await proposeAiRuleRefinement(input);
  if (ai) candidates.push(ai);

  const deterministic = buildDeterministicRefinement(
    input.current,
    input.nextVersion + candidates.length
  );
  if (deterministic) {
    candidates.push({
      definition: deterministic,
      provider: "deterministic-hardening",
      rationale: "우회에 성공한 공격군을 제한된 조건 트리로 보강"
    });
  }
  return candidates;
}

export async function runValidation(ruleId: string) {
  const rule = await prisma.signatureRule.findUnique({
    where: { id: ruleId },
    include: { versions: { orderBy: { version: "asc" } } }
  });
  if (!rule) throw new AppError("시그니처 룰을 찾을 수 없습니다.", 404, "RULE_NOT_FOUND");
  const refinableStatuses = new Set<RuleStatus>([
    RuleStatus.DRAFT,
    RuleStatus.REVIEW_REQUIRED,
    RuleStatus.SANDBOX_TESTED,
    RuleStatus.HOLDOUT_PASSED
  ]);
  if (!refinableStatuses.has(rule.status)) {
    throw new AppError(
      "Draft 또는 검토 단계의 룰만 반복 검증할 수 있습니다.",
      409,
      "INVALID_RULE_STATE"
    );
  }

  const initialVersion = rule.versions.find((item) => item.version === rule.currentVersion);
  if (!initialVersion) {
    throw new AppError("현재 룰 버전을 찾을 수 없습니다.", 409, "RULE_VERSION_NOT_FOUND");
  }
  let currentDefinition = assertSafeDefinition(
    signatureDefinitionSchema.parse(initialVersion.definition)
  );
  let currentVersionRecord = initialVersion;
  let nextVersion = Math.max(...rule.versions.map((item) => item.version)) + 1;

  const validationSamples = await prisma.datasetSample.findMany({
    where: {
      dataset: {
        protectedServiceId: rule.protectedServiceId,
        kind: { in: [DatasetKind.ATTACK_VALIDATION, DatasetKind.NORMAL_VALIDATION] }
      },
      OR: [{ expectedAttack: false }, { category: rule.category }]
    }
  });
  if (validationSamples.length === 0) {
    throw new AppError("검증 데이터셋이 비어 있습니다.", 409, "VALIDATION_DATASET_EMPTY");
  }

  const existingRun = await prisma.validationRun.findUnique({ where: { activeKey: rule.id } });
  if (existingRun) {
    const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
    if ((existingRun.startedAt ?? existingRun.createdAt) > staleBefore) {
      throw new AppError("이 룰의 검증이 이미 실행 중입니다.", 409, "VALIDATION_ALREADY_RUNNING");
    }
    await prisma.validationRun.update({
      where: { id: existingRun.id },
      data: { activeKey: null, status: ValidationStatus.FAILED, completedAt: new Date() }
    });
  }

  let run;
  try {
    run = await prisma.validationRun.create({
      data: {
        ruleId: rule.id,
        ruleVersionId: initialVersion.id,
        status: ValidationStatus.HARDENING,
        activeKey: rule.id,
        rounds: [],
        startedAt: new Date()
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new AppError("이 룰의 검증이 이미 실행 중입니다.", 409, "VALIDATION_ALREADY_RUNNING");
    }
    throw error;
  }

  const rounds: Array<Record<string, unknown>> = [];
  let adversarialCorpus: AdversarialSample[] = [];
  try {
    for (let round = 1; round <= env.adversarialMaxRounds; round += 1) {
      const baselineDataset = evaluateDataset(currentDefinition, validationSamples);
      const deterministicSet = buildAdversarialSet(validationSamples, rule.category, round);
      const aiSet = await proposeAiAdversarialSamples({
        current: currentDefinition,
        round,
        seedPayloads: validationSamples
          .filter((sample) => sample.expectedAttack && sample.category === rule.category)
          .map(findPrimaryValue),
        existingStrategies: adversarialCorpus.map((sample) => sample.strategy)
      });
      adversarialCorpus = mergeAdversarialSamples(adversarialCorpus, deterministicSet, aiSet);
      const adversarialSet = adversarialCorpus;
      const baselineAdversarial = evaluateAdversarial(currentDefinition, adversarialSet);
      const bypasses = baselineAdversarial.results
        .filter((result) => !result.detected)
        .map(({ strategy, value }) => ({ strategy, value }));
      const baseline = {
        ...baselineDataset.metrics,
        bypassSuccessRate: baselineAdversarial.bypassSuccessRate
      };

      if (bypasses.length === 0) {
        rounds.push({
          round,
          fromVersion: currentDefinition.version,
          baseline,
          generatedBy: {
            deterministic: deterministicSet.length,
            ai: aiSet.length,
            cumulative: adversarialCorpus.length
          },
          stopped: "no_bypass"
        });
        break;
      }

      const proposals = await buildCandidates({
        current: currentDefinition,
        nextVersion,
        bypasses,
        metrics: baseline
      });
      const evaluated: CandidateEvaluation[] = proposals.map((proposal) => {
        const dataset = evaluateDataset(proposal.definition, validationSamples);
        const adversarial = evaluateAdversarial(proposal.definition, adversarialSet);
        return {
          ...proposal,
          metrics: {
            ...dataset.metrics,
            bypassSuccessRate: adversarial.bypassSuccessRate,
            averageLatencyMs: Math.max(
              dataset.metrics.averageLatencyMs,
              adversarial.averageLatencyMs
            )
          }
        };
      });
      const adoptable = evaluated
        .filter((candidate) => shouldAdoptCandidate(baseline, candidate.metrics))
        .sort(
          (left, right) =>
            left.metrics.bypassSuccessRate - right.metrics.bypassSuccessRate ||
            left.metrics.falsePositiveRate - right.metrics.falsePositiveRate ||
            right.metrics.attackDetectionRate - left.metrics.attackDetectionRate
        );
      const winner = adoptable[0];

      for (const candidate of evaluated) {
        const accepted = candidate === winner;
        const created = await prisma.signatureRuleVersion.create({
          data: {
            ruleId: rule.id,
            version: candidate.definition.version,
            definition: asJson(candidate.definition),
            note: candidate.rationale,
            definitionHash: hashDefinition(candidate.definition),
            origin:
              candidate.provider === "deterministic-hardening"
                ? "DETERMINISTIC_HARDENING"
                : "AI_HARDENING",
            parentVersion: currentDefinition.version,
            adversarialRound: round,
            proposalProvider: candidate.provider,
            evaluationMetrics: asJson(candidate.metrics),
            accepted
          }
        });
        nextVersion = Math.max(nextVersion, candidate.definition.version + 1);
        if (accepted) currentVersionRecord = created;
      }

      rounds.push({
        round,
        fromVersion: currentDefinition.version,
        bypassCount: bypasses.length,
        bypasses: bypasses.map(({ strategy }) => strategy),
        generatedBy: {
          deterministic: deterministicSet.length,
          ai: aiSet.length,
          cumulative: adversarialCorpus.length
        },
        baseline,
        proposals: evaluated.map((candidate) => ({
          version: candidate.definition.version,
          provider: candidate.provider,
          accepted: candidate === winner,
          metrics: candidate.metrics
        }))
      });

      if (!winner) break;
      currentDefinition = winner.definition;
      await prisma.signatureRule.update({
        where: { id: rule.id },
        data: { currentVersion: currentDefinition.version }
      });
    }

    const finalDataset = evaluateDataset(currentDefinition, validationSamples);
    const finalAdversarialSet = mergeAdversarialSamples(
      adversarialCorpus,
      buildAdversarialSet(validationSamples, rule.category, env.adversarialMaxRounds)
    );
    const finalAdversarial = evaluateAdversarial(currentDefinition, finalAdversarialSet);
    const sandboxPassed =
      finalDataset.metrics.attackDetectionRate >= 0.8 &&
      finalDataset.metrics.falsePositiveRate <= 0.1 &&
      finalAdversarial.bypassSuccessRate <= 0.1;

    await prisma.signatureRule.update({
      where: { id: rule.id },
      data: {
        currentVersion: currentDefinition.version,
        status: sandboxPassed ? RuleStatus.SANDBOX_TESTED : RuleStatus.REVIEW_REQUIRED
      }
    });

    let holdout:
      | {
          results: EvaluatedDatasetSample[];
          metrics: ValidationMetrics;
          passed: boolean;
          datasetHash: string;
        }
      | undefined;
    if (sandboxPassed) {
      const holdoutDatasets = await prisma.dataset.findMany({
        where: {
          protectedServiceId: rule.protectedServiceId,
          kind: DatasetKind.HOLDOUT
        },
        include: { samples: true }
      });
      if (holdoutDatasets.length === 0) {
        throw new AppError("Holdout 데이터셋이 비어 있습니다.", 409, "HOLDOUT_DATASET_EMPTY");
      }
      for (const dataset of holdoutDatasets) {
        const currentHash = hashDatasetSamples(dataset.samples);
        if (
          !dataset.lockedAt ||
          !dataset.contentHash ||
          dataset.sampleCount !== dataset.samples.length ||
          dataset.contentHash !== currentHash
        ) {
          throw new AppError(
            "Holdout 데이터셋 무결성 검증에 실패했습니다.",
            409,
            "HOLDOUT_INTEGRITY_FAILED"
          );
        }
      }
      const allHoldoutSamples = holdoutDatasets.flatMap((dataset) => dataset.samples);
      const holdoutSamples = allHoldoutSamples.filter(
        (sample) => !sample.expectedAttack || sample.category === rule.category
      );
      if (holdoutSamples.length === 0) {
        throw new AppError("Holdout 데이터셋이 비어 있습니다.", 409, "HOLDOUT_DATASET_EMPTY");
      }
      const evaluated = evaluateDataset(currentDefinition, holdoutSamples);
      holdout = {
        ...evaluated,
        datasetHash: hashDatasetSamples(allHoldoutSamples),
        passed:
          evaluated.metrics.attackDetectionRate >= 0.8 && evaluated.metrics.falsePositiveRate <= 0.1
      };
    }

    return await prisma.$transaction(async (transaction) => {
      await transaction.validationCaseResult.createMany({
        data: finalDataset.results.map(({ sample, detected, reasons, latencyMs }) => ({
          validationRunId: run.id,
          datasetSampleId: sample.id,
          detected,
          expectedAttack: sample.expectedAttack,
          matchedReasons: asJson(reasons),
          latencyMs
        }))
      });
      if (holdout) {
        await transaction.holdoutEvaluation.create({
          data: {
            validationRunId: run.id,
            sampleCount: holdout.results.length,
            datasetHash: holdout.datasetHash,
            attackDetectionRate: holdout.metrics.attackDetectionRate,
            falsePositiveRate: holdout.metrics.falsePositiveRate,
            confidence: holdout.metrics.confidence,
            passed: holdout.passed
          }
        });
      }
      const passed = sandboxPassed && Boolean(holdout?.passed);
      const updatedRun = await transaction.validationRun.update({
        where: { id: run.id },
        data: {
          ruleVersionId: currentVersionRecord.id,
          status: passed ? ValidationStatus.PASSED : ValidationStatus.FAILED,
          activeKey: null,
          attackDetectionRate: finalDataset.metrics.attackDetectionRate,
          falsePositiveRate: finalDataset.metrics.falsePositiveRate,
          bypassSuccessRate: finalAdversarial.bypassSuccessRate,
          confidence: finalDataset.metrics.confidence,
          rounds: asJson(rounds),
          completedAt: new Date()
        },
        include: { cases: { include: { datasetSample: true } }, holdoutEvaluation: true }
      });
      await transaction.signatureRule.update({
        where: { id: rule.id },
        data: {
          status: passed ? RuleStatus.HOLDOUT_PASSED : RuleStatus.REVIEW_REQUIRED,
          currentVersion: currentDefinition.version,
          confidence: finalDataset.metrics.confidence,
          falsePositiveRate: finalDataset.metrics.falsePositiveRate
        }
      });
      return updatedRun;
    });
  } catch (error) {
    await prisma.validationRun.update({
      where: { id: run.id },
      data: {
        status: ValidationStatus.FAILED,
        activeKey: null,
        rounds: asJson(rounds),
        completedAt: new Date()
      }
    });
    throw error;
  }
}

export async function getValidationRun(id: string) {
  const run = await prisma.validationRun.findUnique({
    where: { id },
    include: {
      rule: { include: { versions: { orderBy: { version: "asc" } } } },
      ruleVersion: true,
      cases: { include: { datasetSample: true } },
      holdoutEvaluation: true
    }
  });
  if (!run) throw new AppError("검증 실행을 찾을 수 없습니다.", 404, "VALIDATION_NOT_FOUND");
  return run;
}
