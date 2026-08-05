import { RequestEventSource } from "@prisma/client";
import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";
import { captureSnapshot } from "../services/request-event.service.js";
import { fingerprint, sanitizeUnknown } from "../services/sanitizer.service.js";
import { extractWafRuleMatches } from "../services/modsecurity-audit.service.js";
import { createSuccessResponse } from "../utils/api-response.js";
import { asJson } from "../utils/json.js";

export const ingestRequestEvent: RequestHandler = async (request, response) => {
  const body = request.body;
  const serializedBody = JSON.stringify(body.payload ?? {});
  const result = await captureSnapshot(
    {
      method: body.method,
      path: body.path,
      query: body.query ?? {},
      bodyPreview: serializedBody.slice(0, 32_768),
      parsedBodyFields: sanitizeUnknown(body.payload ?? {}),
      headers: sanitizeUnknown(body.headers ?? {}) as Record<string, string>,
      bodyHash: fingerprint(serializedBody),
      bodySize: Buffer.byteLength(serializedBody),
      ipFingerprint: fingerprint(body.ip ?? "telemetry"),
      analysisQuery: body.query ?? {},
      analysisBody: body.payload ?? {},
      replaySafePayload: {
        method: body.method,
        path: body.path,
        query: body.query ?? {},
        body: sanitizeUnknown(body.payload ?? {}),
        headers: sanitizeUnknown(body.headers ?? {}) as Record<string, string>
      }
    },
    {
      eventId: body.eventId ?? randomUUID(),
      protectedServiceId: body.protectedServiceId,
      source: body.source ?? RequestEventSource.TELEMETRY,
      simulationId: body.simulationId,
      responseStatus: body.responseStatus,
      contentType: body.contentType,
      userAgent: body.userAgent
    }
  );
  response
    .status(202)
    .json(createSuccessResponse({ eventId: result.event.id, blocked: result.blocked }));
};

export const ingestSecurityEvent: RequestHandler = async (request, response) => {
  const eventId = String(request.body.eventId);
  const existing = await prisma.auditLog.findFirst({
    where: { resourceType: "SecurityEvent", resourceId: eventId }
  });
  if (!existing) {
    await prisma.auditLog.create({
      data: {
        action: "SECURITY_EVENT_INGESTED",
        resourceType: "SecurityEvent",
        resourceId: eventId,
        metadata: asJson(sanitizeUnknown(request.body.event))
      }
    });
  }
  response
    .status(202)
    .json(createSuccessResponse({ accepted: true, duplicate: Boolean(existing), eventId }));
};

type OtlpLogRecord = { body?: { stringValue?: string } };

function getOtlpLogRecords(body: unknown): OtlpLogRecord[] {
  if (typeof body !== "object" || body === null) return [];
  const resourceLogs = (body as { resourceLogs?: unknown[] }).resourceLogs ?? [];
  return resourceLogs.flatMap((resourceLog) => {
    if (typeof resourceLog !== "object" || resourceLog === null) return [];
    const scopeLogs = (resourceLog as { scopeLogs?: unknown[] }).scopeLogs ?? [];
    return scopeLogs.flatMap((scopeLog) => {
      if (typeof scopeLog !== "object" || scopeLog === null) return [];
      return (scopeLog as { logRecords?: OtlpLogRecord[] }).logRecords ?? [];
    });
  });
}

export const ingestOtlpLogs: RequestHandler = async (request, response) => {
  const records = getOtlpLogRecords(request.body);
  let accepted = 0;

  for (const record of records.slice(0, 100)) {
    const raw = record.body?.stringValue;
    if (!raw) continue;
    let audit: Record<string, unknown>;
    try {
      audit = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }
    const transaction =
      typeof audit.transaction === "object" && audit.transaction !== null
        ? (audit.transaction as Record<string, unknown>)
        : audit;
    const requestData =
      typeof transaction.request === "object" && transaction.request !== null
        ? (transaction.request as Record<string, unknown>)
        : {};
    const responseData =
      typeof transaction.response === "object" && transaction.response !== null
        ? (transaction.response as Record<string, unknown>)
        : {};
    const auditHeaders =
      typeof requestData.headers === "object" && requestData.headers !== null
        ? (requestData.headers as Record<string, unknown>)
        : {};
    const simulationHeader = Object.entries(auditHeaders).find(
      ([key]) => key.toLowerCase() === "x-aegis-simulation-id"
    )?.[1];
    const simulationId = typeof simulationHeader === "string" ? simulationHeader : undefined;
    const uri = typeof requestData.uri === "string" ? requestData.uri : "/telemetry/unknown";
    const parsedUrl = new URL(uri, "http://telemetry.local");
    const query = Object.fromEntries(parsedUrl.searchParams.entries());
    const rawBody = requestData.body ?? {};
    const sanitizedBody = sanitizeUnknown(rawBody);
    const rawBodyText = JSON.stringify(rawBody);
    const sanitizedBodyText = JSON.stringify(sanitizedBody);
    const method = typeof requestData.method === "string" ? requestData.method : "UNKNOWN";
    const eventId = String(transaction.unique_id ?? transaction.id ?? randomUUID());
    const wafRuleMatches = extractWafRuleMatches(audit);

    await captureSnapshot(
      {
        method,
        path: parsedUrl.pathname,
        query,
        bodyPreview: sanitizedBodyText.slice(0, 32_768),
        parsedBodyFields: sanitizedBody,
        headers: {},
        bodyHash: fingerprint(rawBodyText),
        bodySize: Buffer.byteLength(rawBodyText),
        ipFingerprint: fingerprint(String(transaction.client_ip ?? "waf")),
        analysisQuery: query,
        analysisBody: rawBody,
        replaySafePayload: {
          method,
          path: parsedUrl.pathname,
          query,
          body: sanitizedBody,
          headers: {}
        }
      },
      {
        eventId: `waf:${eventId}`,
        source: simulationId ? RequestEventSource.SIMULATION : RequestEventSource.TELEMETRY,
        simulationId,
        responseStatus:
          typeof responseData.http_code === "number" ? responseData.http_code : undefined,
        wafRuleMatches,
        contentType: "application/json",
        userAgent: "ModSecurity audit log"
      }
    );
    accepted += 1;
  }

  response.status(200).json({ partialSuccess: {}, accepted });
};
