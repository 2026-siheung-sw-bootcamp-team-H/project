import { Router } from "express";
import { z } from "zod";
import {
  createReport,
  getDashboard,
  getDeployments,
  getJob,
  getValidation,
  listProtectedServices
} from "../controllers/platform.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const platformRouter = Router();
platformRouter.use(requireAdmin);
platformRouter.get("/protected-services", listProtectedServices);
platformRouter.get("/dashboard", getDashboard);
platformRouter.get("/deployments", getDeployments);
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
