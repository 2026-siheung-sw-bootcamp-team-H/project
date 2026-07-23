import { SecurityScanStage, SecurityScanStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  compareScans,
  getScan,
  listScans,
  startSecurityScan,
  streamScanEvents,
  zapHealth
} from "../controllers/security-scan.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const securityScanRouter = Router();
securityScanRouter.use(requireAdmin);
securityScanRouter.get("/health", zapHealth);
securityScanRouter.get(
  "/compare",
  validateRequest({ query: z.object({ ruleId: z.string().uuid() }) }),
  compareScans
);
securityScanRouter.get(
  "/",
  validateRequest({
    query: z.object({
      protectedServiceId: z.string().uuid().optional(),
      ruleId: z.string().uuid().optional(),
      stage: z.nativeEnum(SecurityScanStage).optional(),
      status: z.nativeEnum(SecurityScanStatus).optional(),
      limit: z.coerce.number().int().positive().max(100).optional()
    })
  }),
  listScans
);
securityScanRouter.post(
  "/",
  validateRequest({
    body: z
      .object({
        stage: z.nativeEnum(SecurityScanStage),
        protectedServiceId: z.string().uuid().optional(),
        ruleId: z.string().uuid().optional(),
        deploymentId: z.string().uuid().optional()
      })
      .strict()
  }),
  startSecurityScan
);
securityScanRouter.get(
  "/:id/events",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  streamScanEvents
);
securityScanRouter.get(
  "/:id",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getScan
);
