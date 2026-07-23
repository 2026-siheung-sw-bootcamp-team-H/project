import {
  EnforcementAction,
  type RequestEventSource,
  type AttackCategory,
  type Prisma,
  type TrafficClassification
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { getOpenSearchClient } from "../config/opensearch.js";
import { ensureRequestEventIndex } from "./search-index.service.js";

export type RequestEventSearchFilters = {
  q?: string;
  protectedServiceId?: string;
  source?: RequestEventSource;
  simulationId?: string;
  classification?: TrafficClassification;
  category?: AttackCategory;
  action?: EnforcementAction;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

function buildPostgresWhere(filters: RequestEventSearchFilters): Prisma.RequestEventWhereInput {
  return {
    protectedServiceId: filters.protectedServiceId,
    source: filters.source,
    simulationId: filters.simulationId,
    occurredAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    detections:
      filters.classification || filters.category
        ? {
            some: {
              classification: filters.classification,
              attackCategory: filters.category
            }
          }
        : undefined,
    enforcements: filters.action ? { some: { action: filters.action } } : undefined,
    OR: filters.q
      ? [
          { path: { contains: filters.q, mode: "insensitive" } },
          { method: { contains: filters.q, mode: "insensitive" } },
          { sanitizedRequest: { bodyPreview: { contains: filters.q, mode: "insensitive" } } },
          { normalizedRequest: { normalizedQuery: { contains: filters.q, mode: "insensitive" } } },
          { normalizedRequest: { normalizedBody: { contains: filters.q, mode: "insensitive" } } }
        ]
      : undefined
  };
}

function countValues(values: Array<string | null | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (value) counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function searchPostgres(filters: RequestEventSearchFilters, degraded: boolean) {
  const where = buildPostgresWhere(filters);
  const [total, items, aggregateRows] = await Promise.all([
    prisma.requestEvent.count({ where }),
    prisma.requestEvent.findMany({
      where,
      include: {
        protectedService: true,
        sanitizedRequest: true,
        normalizedRequest: true,
        detections: { orderBy: { createdAt: "desc" } },
        enforcements: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { occurredAt: "desc" },
      skip: filters.offset ?? 0,
      take: Math.min(filters.limit ?? 50, 100)
    }),
    prisma.requestEvent.findMany({
      where,
      select: {
        occurredAt: true,
        detections: { select: { classification: true, attackCategory: true } },
        enforcements: { select: { action: true } }
      },
      orderBy: { occurredAt: "desc" },
      take: 5000
    })
  ]);
  return {
    source: "postgresql" as const,
    degraded,
    total,
    items,
    aggregations: {
      classifications: countValues(
        aggregateRows.flatMap((row) => row.detections.map((item) => item.classification))
      ),
      attackCategories: countValues(
        aggregateRows.flatMap((row) => row.detections.map((item) => item.attackCategory))
      ),
      actions: countValues(
        aggregateRows.flatMap((row) => row.enforcements.map((item) => item.action))
      ),
      blocked: aggregateRows.filter((row) =>
        row.enforcements.some((item) => item.action === EnforcementAction.BLOCK)
      ).length,
      sampled: aggregateRows.length,
      timezone: "UTC"
    }
  };
}

export async function searchRequestEvents(filters: RequestEventSearchFilters) {
  if (!env.openSearchEnabled) return searchPostgres(filters, false);
  try {
    await ensureRequestEventIndex();
    const must = filters.q
      ? [
          {
            multi_match: {
              query: filters.q,
              fields: ["path", "bodyPreview", "normalizedQuery", "normalizedBody", "userAgent"]
            }
          }
        ]
      : [{ match_all: {} }];
    const filter: Array<Record<string, unknown>> = [];
    if (filters.classification) filter.push({ term: { classifications: filters.classification } });
    if (filters.protectedServiceId)
      filter.push({ term: { protectedServiceId: filters.protectedServiceId } });
    if (filters.source) filter.push({ term: { source: filters.source } });
    if (filters.simulationId) filter.push({ term: { simulationId: filters.simulationId } });
    if (filters.category) filter.push({ term: { attackCategories: filters.category } });
    if (filters.action) filter.push({ term: { actions: filters.action } });
    if (filters.from || filters.to) {
      filter.push({
        range: {
          occurredAt: {
            ...(filters.from ? { gte: filters.from.toISOString() } : {}),
            ...(filters.to ? { lte: filters.to.toISOString() } : {})
          }
        }
      });
    }
    const response = await getOpenSearchClient().search({
      index: env.openSearchIndex,
      body: {
        from: filters.offset ?? 0,
        size: Math.min(filters.limit ?? 50, 100),
        query: { bool: { must, filter } },
        sort: [{ occurredAt: { order: "desc" } }],
        aggs: {
          classifications: { terms: { field: "classifications", size: 20 } },
          attackCategories: { terms: { field: "attackCategories", size: 20 } },
          actions: { terms: { field: "actions", size: 20 } },
          blocked: { filter: { term: { blocked: true } } },
          hourly: { date_histogram: { field: "occurredAt", fixed_interval: "1h" } }
        }
      }
    });
    const body = response.body as {
      hits: {
        total: number | { value: number };
        hits: Array<{ _id: string; _source: Record<string, unknown> }>;
      };
      aggregations?: Record<string, unknown>;
    };
    return {
      source: "opensearch" as const,
      degraded: false,
      total: typeof body.hits.total === "number" ? body.hits.total : body.hits.total.value,
      items: body.hits.hits.map((hit) => ({ id: hit._id, ...hit._source })),
      aggregations: { ...body.aggregations, timezone: "UTC" }
    };
  } catch (error) {
    console.warn("OpenSearch query failed; falling back to PostgreSQL.", error);
    return searchPostgres(filters, true);
  }
}

export async function getRequestEventSearchHealth() {
  if (!env.openSearchEnabled) {
    return { enabled: false, available: false, mode: "postgresql" as const };
  }
  try {
    const response = await getOpenSearchClient().cluster.health();
    return { enabled: true, available: true, mode: "opensearch" as const, cluster: response.body };
  } catch (error) {
    return {
      enabled: true,
      available: false,
      mode: "postgresql-fallback" as const,
      error: error instanceof Error ? error.message : "OpenSearch unavailable"
    };
  }
}
