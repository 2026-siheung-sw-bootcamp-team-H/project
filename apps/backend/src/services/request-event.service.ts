import {
  AttackCategory,
  EnforcementAction,
  EnforcementSource,
  RuleStatus,
  TrafficClassification,
  type Prisma
} from "@prisma/client";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import {
  signatureDefinitionSchema,
  type SignatureDefinition
} from "../schemas/signature.schema.js";
import { AppError } from "../utils/app-error.js";
import { asJson, asRecord } from "../utils/json.js";
import { normalizePayload } from "./normalizer.service.js";
import { sanitizeRequest, type SanitizedSnapshot } from "./sanitizer.service.js";
import { evaluateSignature } from "./signature-detector.service.js";
import { buildRuleDefinition } from "./rule-generator.service.js";

type CaptureOptions = {
  responseStatus?: number;
  forcedClassification?: TrafficClassification;
  eventId?: string;
};

function inferCategory(normalized: ReturnType<typeof normalizePayload>): AttackCategory | null {
  for (const category of Object.values(AttackCategory)) {
    const definition = buildRuleDefinition(category, `HEURISTIC-${category}`);
    if (evaluateSignature(definition, normalized).matched) return category;
  }
  return null;
}

function parseDefinition(value: Prisma.JsonValue): SignatureDefinition | null {
  const result = signatureDefinitionSchema.safeParse(value);
  return result.success ? result.data : null;
}

export async function captureRequestEvent(request: Request, options: CaptureOptions = {}) {
  const snapshot = sanitizeRequest(request);
  return captureSnapshot(snapshot, {
    ...options,
    contentType: request.header("content-type"),
    userAgent: request.header("user-agent")
  });
}

export async function captureSnapshot(
  snapshot: SanitizedSnapshot,
  options: CaptureOptions & { contentType?: string; userAgent?: string } = {}
) {
  const service = await prisma.protectedService.findUnique({ where: { slug: "demo-shop" } });
  if (!service) {
    throw new AppError(
      "Demo Shop 서비스가 초기화되지 않았습니다. seed를 실행해 주세요.",
      503,
      "SERVICE_NOT_SEEDED"
    );
  }

  if (options.eventId) {
    const existing = await prisma.requestEvent.findUnique({
      where: { eventId: options.eventId },
      include: {
        sanitizedRequest: true,
        normalizedRequest: true,
        detections: true,
        enforcements: true
      }
    });
    if (existing) {
      return {
        event: existing,
        blocked: existing.enforcements.some((item) => item.action === EnforcementAction.BLOCK),
        category: existing.detections.find((item) => item.attackCategory)?.attackCategory ?? null
      };
    }
  }

  const normalized = normalizePayload(
    snapshot.analysisQuery,
    snapshot.analysisBody,
    snapshot.path,
    snapshot.headers
  );
  const inferredCategory = inferCategory(normalized);
  const classification =
    options.forcedClassification ??
    (inferredCategory ? TrafficClassification.ATTACK : TrafficClassification.NORMAL);

  const activeRules = await prisma.signatureRule.findMany({
    where: { protectedServiceId: service.id, status: RuleStatus.ACTIVE },
    include: { versions: true }
  });

  const evaluatedRules = activeRules.flatMap((rule) => {
    const version = rule.versions.find((item) => item.version === rule.currentVersion);
    if (!version) return [];
    const definition = parseDefinition(version.definition);
    if (!definition) return [];
    const result = evaluateSignature(definition, normalized);
    return [{ rule, version, result }];
  });
  const matchedRules = evaluatedRules.filter(({ result }) => result.matched);
  const blocked = matchedRules.length > 0;
  const expiresAt = new Date(Date.now() + env.safeReplayRetentionHours * 60 * 60 * 1000);

  const event = await prisma.requestEvent.create({
    data: {
      eventId: options.eventId ?? randomUUID(),
      protectedServiceId: service.id,
      method: snapshot.method,
      path: snapshot.path,
      contentType: options.contentType,
      bodyHash: snapshot.bodyHash,
      bodySize: snapshot.bodySize,
      ipFingerprint: snapshot.ipFingerprint,
      userAgent: options.userAgent,
      responseStatus: blocked ? 403 : options.responseStatus,
      sanitizedRequest: {
        create: {
          query: asJson(snapshot.query),
          bodyPreview: snapshot.bodyPreview,
          parsedBodyFields: asJson(snapshot.parsedBodyFields ?? {}),
          headers: asJson(snapshot.headers)
        }
      },
      replayPayload: {
        create: {
          method: snapshot.replaySafePayload.method,
          path: snapshot.replaySafePayload.path,
          query: asJson(snapshot.replaySafePayload.query),
          body: asJson(snapshot.replaySafePayload.body ?? {}),
          headers: asJson(snapshot.replaySafePayload.headers),
          expiresAt
        }
      },
      normalizedRequest: {
        create: {
          normalizedQuery: normalized.normalizedQuery,
          normalizedBody: normalized.normalizedBody,
          commentCollapsed: normalized.commentCollapsed,
          normalizationSteps: asJson(normalized.normalizationSteps),
          tokens: normalized.tokens,
          status: normalized.status,
          errorStep: normalized.errorStep
        }
      },
      detections: {
        create: [
          {
            classification,
            attackCategory: inferredCategory,
            matched: Boolean(inferredCategory),
            score: inferredCategory ? 0.8 : 0,
            reasons: asJson(inferredCategory ? [`heuristic:${inferredCategory}`] : [])
          },
          ...evaluatedRules.map(({ rule, version, result }) => ({
            ruleVersionId: version.id,
            classification: result.matched
              ? TrafficClassification.ATTACK
              : TrafficClassification.NORMAL,
            attackCategory: result.matched ? rule.category : null,
            matched: result.matched,
            score: result.matched ? 1 : 0,
            reasons: asJson(result.reasons)
          }))
        ]
      },
      enforcements: {
        create: {
          ruleVersionId: matchedRules[0]?.version.id,
          action: blocked ? EnforcementAction.BLOCK : EnforcementAction.ALLOW,
          source: blocked ? EnforcementSource.INTERNAL_RULE : EnforcementSource.NONE,
          reason: blocked
            ? `active rules: ${matchedRules.map(({ rule }) => rule.externalId).join(", ")}`
            : null
        }
      }
    },
    include: {
      sanitizedRequest: true,
      normalizedRequest: true,
      detections: true,
      enforcements: true
    }
  });

  return { event, blocked, category: inferredCategory };
}

export async function listRequestEvents(filters: {
  classification?: TrafficClassification;
  category?: AttackCategory;
  limit?: number;
  cursor?: string;
}) {
  return prisma.requestEvent.findMany({
    where: {
      detections:
        filters.classification || filters.category
          ? {
              some: {
                classification: filters.classification,
                attackCategory: filters.category
              }
            }
          : undefined
    },
    include: {
      sanitizedRequest: true,
      normalizedRequest: true,
      detections: { orderBy: { createdAt: "desc" } },
      enforcements: { orderBy: { createdAt: "desc" } }
    },
    orderBy: { occurredAt: "desc" },
    take: Math.min(filters.limit ?? 50, 100),
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {})
  });
}

export async function getRequestEvent(id: string) {
  const event = await prisma.requestEvent.findUnique({
    where: { id },
    include: {
      protectedService: true,
      sanitizedRequest: true,
      replayPayload: true,
      normalizedRequest: true,
      detections: { include: { ruleVersion: { include: { rule: true } } } },
      enforcements: true
    }
  });
  if (!event) throw new AppError("요청 이벤트를 찾을 수 없습니다.", 404, "REQUEST_EVENT_NOT_FOUND");
  if (event.replayPayload && event.replayPayload.expiresAt <= new Date()) {
    return { ...event, replayPayload: null };
  }
  return event;
}

export async function renormalizeRequestEvent(id: string) {
  const event = await getRequestEvent(id);
  const normalized = normalizePayload(
    asRecord(event.sanitizedRequest?.query),
    event.sanitizedRequest?.parsedBodyFields,
    event.path,
    asRecord(event.sanitizedRequest?.headers)
  );
  return prisma.normalizedRequest.upsert({
    where: { requestEventId: id },
    update: {
      normalizedQuery: normalized.normalizedQuery,
      normalizedBody: normalized.normalizedBody,
      commentCollapsed: normalized.commentCollapsed,
      normalizationSteps: asJson(normalized.normalizationSteps),
      tokens: normalized.tokens,
      status: normalized.status,
      errorStep: normalized.errorStep
    },
    create: {
      requestEventId: id,
      normalizedQuery: normalized.normalizedQuery,
      normalizedBody: normalized.normalizedBody,
      commentCollapsed: normalized.commentCollapsed,
      normalizationSteps: asJson(normalized.normalizationSteps),
      tokens: normalized.tokens,
      status: normalized.status,
      errorStep: normalized.errorStep
    }
  });
}
