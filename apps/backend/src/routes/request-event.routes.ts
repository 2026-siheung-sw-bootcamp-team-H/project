import {
  AttackCategory,
  EnforcementAction,
  RequestEventSource,
  TrafficClassification
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  getEvent,
  listEvents,
  normalizeEvent,
  searchEvents,
  searchHealth
} from "../controllers/request-event.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const requestEventRouter = Router();
requestEventRouter.use(requireAdmin);
requestEventRouter.get("/search/health", searchHealth);
requestEventRouter.get(
  "/search",
  validateRequest({
    query: z.object({
      q: z.string().trim().min(1).max(200).optional(),
      classification: z.nativeEnum(TrafficClassification).optional(),
      category: z.nativeEnum(AttackCategory).optional(),
      protectedServiceId: z.string().uuid().optional(),
      source: z.nativeEnum(RequestEventSource).optional(),
      simulationId: z.string().uuid().optional(),
      action: z.nativeEnum(EnforcementAction).optional(),
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      offset: z.coerce.number().int().nonnegative().max(10_000).optional()
    })
  }),
  searchEvents
);
requestEventRouter.get(
  "/",
  validateRequest({
    query: z.object({
      classification: z.nativeEnum(TrafficClassification).optional(),
      category: z.nativeEnum(AttackCategory).optional(),
      protectedServiceId: z.string().uuid().optional(),
      source: z.nativeEnum(RequestEventSource).optional(),
      simulationId: z.string().uuid().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      cursor: z.string().uuid().optional()
    })
  }),
  listEvents
);
requestEventRouter.get(
  "/:id",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getEvent
);
requestEventRouter.post(
  "/:id/normalize",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  normalizeEvent
);
