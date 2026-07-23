import { RequestEventSource } from "@prisma/client";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  ingestOtlpLogs,
  ingestRequestEvent,
  ingestSecurityEvent
} from "../controllers/telemetry.controller.js";
import { requireTelemetryToken } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

const telemetryEvent = z.object({
  eventId: z.string().min(8).max(128).optional(),
  protectedServiceId: z.string().uuid().optional(),
  source: z.nativeEnum(RequestEventSource).optional(),
  simulationId: z.string().uuid().optional(),
  method: z.string().min(1).max(16),
  path: z.string().min(1).max(2048),
  query: z.record(z.string(), z.unknown()).default({}),
  payload: z.unknown().optional(),
  headers: z.record(z.string(), z.string()).default({}),
  ip: z.string().max(128).optional(),
  userAgent: z.string().max(1024).optional(),
  contentType: z.string().max(256).optional(),
  responseStatus: z.number().int().min(100).max(599).optional()
});

export const telemetryRouter = Router();
telemetryRouter.use(
  rateLimit({ windowMs: 60_000, limit: 1000, standardHeaders: "draft-8", legacyHeaders: false }),
  requireTelemetryToken
);
telemetryRouter.post(
  "/request-events",
  validateRequest({ body: telemetryEvent }),
  ingestRequestEvent
);
telemetryRouter.post(
  "/security-events",
  validateRequest({
    body: z.object({
      eventId: z.string().min(8).max(128),
      event: z.record(z.string(), z.unknown())
    })
  }),
  ingestSecurityEvent
);
telemetryRouter.post("/otlp/v1/logs", ingestOtlpLogs);
