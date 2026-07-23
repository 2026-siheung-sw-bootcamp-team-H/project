import { SecurityScanStatus } from "@prisma/client";
import type { RequestHandler } from "express";
import {
  compareSecurityScans,
  createSecurityScan,
  getSecurityScan,
  getSecurityScanProgress,
  getZapHealth,
  listSecurityScans
} from "../services/security-scan.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

const terminalStatuses = new Set<SecurityScanStatus>([
  SecurityScanStatus.COMPLETED,
  SecurityScanStatus.FAILED
]);

export const startSecurityScan: RequestHandler = async (request, response) => {
  response.status(202).json(createSuccessResponse(await createSecurityScan(request.body)));
};

export const listScans: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await listSecurityScans({
        protectedServiceId: request.query.protectedServiceId as string | undefined,
        ruleId: request.query.ruleId as string | undefined,
        stage: request.query.stage as never,
        status: request.query.status as never,
        limit: request.query.limit ? Number(request.query.limit) : undefined
      })
    )
  );
};

export const getScan: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getSecurityScan(String(request.params.id))));
};

export const compareScans: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await compareSecurityScans(String(request.query.ruleId))));
};

export const zapHealth: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await getZapHealth()));
};

export const streamScanEvents: RequestHandler = async (request, response) => {
  const scanId = String(request.params.id);
  await getSecurityScanProgress(scanId);
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders();

  let closed = false;
  let reading = false;
  let lastVersion = "";
  const send = async () => {
    if (closed || reading) return;
    reading = true;
    try {
      const scan = await getSecurityScanProgress(scanId);
      const version = `${scan.status}:${scan.progress}:${scan.updatedAt.toISOString()}`;
      if (version !== lastVersion) {
        response.write(`event: progress\ndata: ${JSON.stringify(scan)}\n\n`);
        lastVersion = version;
      } else {
        response.write(": keep-alive\n\n");
      }
      if (terminalStatuses.has(scan.status)) {
        response.write(`event: complete\ndata: ${JSON.stringify(scan)}\n\n`);
        response.end();
        closed = true;
      }
    } catch (error) {
      response.write(
        `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "SSE error" })}\n\n`
      );
      response.end();
      closed = true;
    } finally {
      reading = false;
    }
  };

  void send();
  const timer = setInterval(() => void send(), 1000);
  timer.unref();
  request.on("close", () => {
    closed = true;
    clearInterval(timer);
  });
};
