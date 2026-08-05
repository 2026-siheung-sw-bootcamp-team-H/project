import { getOpenSearchClient } from "../config/opensearch.js";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { getSecurityQueue } from "../config/queue.js";

const staleLockMs = 5 * 60_000;
let requestEventIndexReady = false;
let requestEventIndexInitialization: Promise<void> | undefined;

export async function ensureRequestEventIndex() {
  if (!env.openSearchEnabled || requestEventIndexReady) return;
  requestEventIndexInitialization ??= initializeRequestEventIndex();
  try {
    await requestEventIndexInitialization;
    requestEventIndexReady = true;
  } finally {
    requestEventIndexInitialization = undefined;
  }
}

async function initializeRequestEventIndex() {
  const client = getOpenSearchClient();
  await client.indices.putIndexTemplate({
    name: `${env.openSearchIndex}-template`,
    body: {
      index_patterns: [`${env.openSearchIndex}*`],
      template: {
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          dynamic: "strict",
          properties: {
            id: { type: "keyword" },
            eventId: { type: "keyword" },
            protectedServiceId: { type: "keyword" },
            protectedServiceName: { type: "keyword" },
            source: { type: "keyword" },
            simulationId: { type: "keyword" },
            method: { type: "keyword" },
            path: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 1024 } } },
            contentType: { type: "keyword" },
            responseStatus: { type: "integer" },
            occurredAt: { type: "date" },
            classifications: { type: "keyword" },
            attackCategories: { type: "keyword" },
            actions: { type: "keyword" },
            blocked: { type: "boolean" },
            enforcements: {
              type: "object",
              properties: {
                action: { type: "keyword" },
                source: { type: "keyword" },
                externalRuleId: { type: "keyword" },
                ruleMessage: { type: "text" },
                ruleTags: { type: "keyword" },
                reason: { type: "text" }
              }
            },
            bodyPreview: { type: "text" },
            normalizedQuery: { type: "text" },
            normalizedBody: { type: "text" },
            userAgent: { type: "text", fields: { keyword: { type: "keyword", ignore_above: 512 } } }
          }
        }
      }
    }
  });
  const exists = await client.indices.exists({ index: env.openSearchIndex });
  if (!exists.body) {
    await client.indices.create({ index: env.openSearchIndex });
  } else {
    await client.indices.putMapping({
      index: env.openSearchIndex,
      body: {
        properties: {
          source: { type: "keyword" },
          simulationId: { type: "keyword" },
          enforcements: {
            type: "object",
            properties: {
              action: { type: "keyword" },
              source: { type: "keyword" },
              externalRuleId: { type: "keyword" },
              ruleMessage: { type: "text" },
              ruleTags: { type: "keyword" },
              reason: { type: "text" }
            }
          }
        }
      }
    });
  }
}

export async function enqueueSearchOutbox(outboxId: string) {
  if (!env.openSearchEnabled || !env.queueEnabled) return;
  const outbox = await prisma.searchOutbox.findUnique({ where: { id: outboxId } });
  if (!outbox || outbox.processedAt) return;
  await getSecurityQueue().add(
    "index-request-event",
    { outboxId },
    { jobId: `search-${outbox.id}-${outbox.attempts}`, attempts: 1 }
  );
  await prisma.searchOutbox.updateMany({
    where: { id: outbox.id, processedAt: null },
    data: { lockedAt: new Date() }
  });
}

export async function dispatchPendingSearchOutbox() {
  if (!env.openSearchEnabled || !env.queueEnabled) return 0;
  const pending = await prisma.searchOutbox.findMany({
    where: {
      processedAt: null,
      OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - staleLockMs) } }]
    },
    orderBy: { createdAt: "asc" },
    take: 50
  });
  await Promise.all(pending.map((item) => enqueueSearchOutbox(item.id)));
  return pending.length;
}

export async function backfillSearchOutbox() {
  if (!env.openSearchEnabled) return 0;
  const events = await prisma.requestEvent.findMany({
    where: { searchOutbox: null },
    select: { id: true },
    orderBy: { occurredAt: "asc" },
    take: 500
  });
  if (events.length === 0) return 0;
  const result = await prisma.searchOutbox.createMany({
    data: events.map((event) => ({ requestEventId: event.id })),
    skipDuplicates: true
  });
  return result.count;
}

export async function processSearchOutbox(outboxId: string) {
  if (!env.openSearchEnabled) throw new Error("OpenSearch is disabled.");
  const outbox = await prisma.searchOutbox.findUnique({
    where: { id: outboxId },
    include: {
      requestEvent: {
        include: {
          protectedService: true,
          sanitizedRequest: true,
          normalizedRequest: true,
          detections: true,
          enforcements: true
        }
      }
    }
  });
  if (!outbox || outbox.processedAt) return;
  await ensureRequestEventIndex();
  const event = outbox.requestEvent;
  await getOpenSearchClient().index({
    index: env.openSearchIndex,
    id: event.id,
    refresh: false,
    body: {
      id: event.id,
      eventId: event.eventId,
      protectedServiceId: event.protectedServiceId,
      protectedServiceName: event.protectedService.name,
      source: event.source,
      simulationId: event.simulationId,
      method: event.method,
      path: event.path,
      contentType: event.contentType,
      responseStatus: event.responseStatus,
      occurredAt: event.occurredAt.toISOString(),
      classifications: [...new Set(event.detections.map((item) => item.classification))],
      attackCategories: [
        ...new Set(
          event.detections.flatMap((item) => (item.attackCategory ? [item.attackCategory] : []))
        )
      ],
      actions: [...new Set(event.enforcements.map((item) => item.action))],
      blocked: event.enforcements.some((item) => item.action === "BLOCK"),
      enforcements: event.enforcements.map((item) => ({
        action: item.action,
        source: item.source,
        externalRuleId: item.externalRuleId,
        ruleMessage: item.ruleMessage,
        ruleTags: item.ruleTags,
        reason: item.reason
      })),
      bodyPreview: event.sanitizedRequest?.bodyPreview,
      normalizedQuery: event.normalizedRequest?.normalizedQuery,
      normalizedBody: event.normalizedRequest?.normalizedBody,
      userAgent: event.userAgent
    }
  });
  await prisma.searchOutbox.update({
    where: { id: outbox.id },
    data: { processedAt: new Date(), lockedAt: null, lastError: null }
  });
}

export async function releaseSearchOutbox(outboxId: string, error: Error) {
  await prisma.searchOutbox.updateMany({
    where: { id: outboxId, processedAt: null },
    data: {
      attempts: { increment: 1 },
      lockedAt: null,
      lastError: error.message.slice(0, 2000)
    }
  });
}
