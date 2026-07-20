import { AttackCategory, TrafficClassification } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getEvent, listEvents, normalizeEvent } from "../controllers/request-event.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const requestEventRouter = Router();
requestEventRouter.use(requireAdmin);
requestEventRouter.get(
  "/",
  validateRequest({
    query: z.object({
      classification: z.nativeEnum(TrafficClassification).optional(),
      category: z.nativeEnum(AttackCategory).optional(),
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
