import { DeploymentTargetType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import {
  approve,
  deploy,
  generateRule,
  getArtifact,
  getRule,
  getShadowObservation,
  listRules,
  reject,
  requestApproval,
  validateRule
} from "../controllers/signature-rule.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const signatureRuleRouter = Router();
signatureRuleRouter.use(requireAdmin);
signatureRuleRouter.get("/", listRules);
signatureRuleRouter.post(
  "/generate",
  validateRequest({ body: z.object({ requestEventId: z.string().uuid() }) }),
  generateRule
);
signatureRuleRouter.get(
  "/:id",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getRule
);
signatureRuleRouter.get(
  "/:id/artifact",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getArtifact
);
signatureRuleRouter.get(
  "/:id/shadow-metrics",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  getShadowObservation
);
signatureRuleRouter.post(
  "/:id/validate",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  validateRule
);
signatureRuleRouter.post(
  "/:id/request-approval",
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  requestApproval
);
signatureRuleRouter.post(
  "/:id/approve",
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ reason: z.string().max(1000).optional() })
  }),
  approve
);
signatureRuleRouter.post(
  "/:id/reject",
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ reason: z.string().min(1).max(1000) })
  }),
  reject
);
signatureRuleRouter.post(
  "/:id/deploy",
  validateRequest({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      mode: z.enum(["shadow", "active", "rollback"]),
      targetType: z.nativeEnum(DeploymentTargetType).default(DeploymentTargetType.INTERNAL)
    })
  }),
  deploy
);
