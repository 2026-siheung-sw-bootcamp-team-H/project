import { createHmac } from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";

const sensitiveKeys =
  /^(authorization|cookie|set-cookie|password|passwd|secret|token|access_token|refresh_token|session|creditcard|cardnumber)$/i;
const keptHeaders = new Set([
  "content-type",
  "accept",
  "user-agent",
  "x-request-id",
  "x-forwarded-for"
]);

export type SanitizedSnapshot = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  bodyPreview: string;
  parsedBodyFields: unknown;
  headers: Record<string, string>;
  bodyHash: string;
  bodySize: number;
  ipFingerprint: string;
  /** Ephemeral values for detection only. Callers must never persist these fields. */
  analysisQuery: unknown;
  analysisBody: unknown;
  replaySafePayload: {
    method: string;
    path: string;
    query: Record<string, unknown>;
    body: unknown;
    headers: Record<string, string>;
  };
};

export function fingerprint(value: string): string {
  return createHmac("sha256", env.hmacSecret).update(value).digest("hex");
}

export function sanitizeUnknown(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[DEPTH_LIMIT]";
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitizeUnknown(item, depth + 1));
  if (typeof value !== "object" || value === null) {
    if (typeof value === "string") return value.slice(0, env.maxCaptureBodyBytes);
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 200)
      .map(([key, item]) => [
        key,
        sensitiveKeys.test(key) ? "[REDACTED]" : sanitizeUnknown(item, depth + 1)
      ])
  );
}

function stringifyBody(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "[UNSERIALIZABLE_BODY]";
  }
}

export function sanitizeRequest(request: Request): SanitizedSnapshot {
  const sanitizedBody = sanitizeUnknown(request.body);
  const sanitizedQuery = sanitizeUnknown(request.query) as Record<string, unknown>;
  const serializedBody = stringifyBody(sanitizedBody);
  const originalSerializedBody = stringifyBody(request.body);
  const headers = Object.fromEntries(
    Object.entries(request.headers)
      .filter(([key]) => keptHeaders.has(key.toLowerCase()) && !sensitiveKeys.test(key))
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value ?? "")])
  );
  const forwardedIp = request.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedIp || request.ip || "unknown";

  return {
    method: request.method,
    path: request.path,
    query: sanitizedQuery,
    bodyPreview: serializedBody.slice(0, env.maxCaptureBodyBytes),
    parsedBodyFields: sanitizedBody ?? {},
    headers,
    bodyHash: fingerprint(originalSerializedBody),
    bodySize: Buffer.byteLength(originalSerializedBody, "utf8"),
    ipFingerprint: fingerprint(ip),
    analysisQuery: request.query,
    analysisBody: request.body,
    replaySafePayload: {
      method: request.method,
      path: request.path,
      query: sanitizedQuery,
      body: sanitizedBody ?? {},
      headers
    }
  };
}
