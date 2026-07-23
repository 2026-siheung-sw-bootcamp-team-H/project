import { ServiceStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  createReport,
  getAuditLogs,
  getAiStatus,
  getDashboard,
  getDeployments,
  getProtectedServiceById,
  getJob,
  getValidation,
  listProtectedServices,
  patchProtectedService,
  registerProtectedService,
  startInitialServiceScan,
  testServiceConnection
} from "../controllers/platform.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const platformRouter = Router();
platformRouter.use(requireAdmin);
platformRouter.get("/protected-services", listProtectedServices);
platformRouter.post(
  "/protected-services",
  validateRequest({
    body: z
      .object({
        name: z.string().trim().min(2).max(100),
        publicDomain: z.url(),
        originUrl: z.url(),
        proxyUrl: z.url().optional(),
        connection: z.string().trim().min(2).max(100).optional()
      })
      .strict()
  }),
  registerProtectedService
);
platformRouter.get(
  "/protected-services/:id",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getProtectedServiceById
);
platformRouter.patch(
  "/protected-services/:id",
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
    body: z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        publicDomain: z.url().optional(),
        originUrl: z.url().optional(),
        proxyUrl: z.url().nullable().optional(),
        connection: z.string().trim().min(2).max(100).optional(),
        status: z.nativeEnum(ServiceStatus).optional()
      })
      .strict()
  }),
  patchProtectedService
);
platformRouter.post(
  "/protected-services/:id/connection-test",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  testServiceConnection
);
platformRouter.post(
  "/protected-services/:id/initial-scan",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  startInitialServiceScan
);
platformRouter.get(
  "/dashboard",
  validateRequest({ query: z.object({ serviceId: z.string().uuid().optional() }) }),
  getDashboard
);
platformRouter.get("/deployments", getDeployments);
platformRouter.get(
  "/audit-logs",
  validateRequest({
    query: z.object({
      action: z.string().trim().min(1).max(100).optional(),
      resourceType: z.string().trim().min(1).max(100).optional(),
      resourceId: z.string().trim().min(1).max(128).optional(),
      limit: z.coerce.number().int().positive().max(100).optional()
    })
  }),
  getAuditLogs
);
platformRouter.get("/ai/status", getAiStatus);
platformRouter.get(
  "/jobs/:id",
  validateRequest({ params: z.object({ id: z.string().min(1) }) }),
  getJob
);
platformRouter.get(
  "/validation-runs/:id",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getValidation
);
platformRouter.post(
  "/reports/generate",
  validateRequest({ body: z.object({ ruleId: z.string().uuid() }) }),
  createReport
);
