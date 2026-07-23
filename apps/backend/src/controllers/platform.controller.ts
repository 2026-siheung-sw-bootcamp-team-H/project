import { SecurityScanStage } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { getAiRuntimeStatus } from "../services/ai.service.js";
import { listDeployments } from "../services/deployment.service.js";
import { enqueueSecurityJob, getJobStatus } from "../services/job.service.js";
import { generateReport } from "../services/report.service.js";
import { getValidationRun } from "../services/validation.service.js";
import {
  createProtectedService,
  getProtectedService,
  listProtectedServices as findProtectedServices,
  testProtectedServiceConnection,
  updateProtectedService
} from "../services/protected-service.service.js";
import { createSecurityScan } from "../services/security-scan.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const listProtectedServices: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await findProtectedServices()));
};

export const getProtectedServiceById: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getProtectedService(String(request.params.id))));
};

export const registerProtectedService: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(createSuccessResponse(await createProtectedService(request.body, request.admin!.id)));
};

export const patchProtectedService: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await updateProtectedService(String(request.params.id), request.body, request.admin!.id)
    )
  );
};

export const testServiceConnection: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await testProtectedServiceConnection(String(request.params.id), request.admin!.id)
    )
  );
};

export const startInitialServiceScan: RequestHandler = async (request, response) => {
  const serviceId = String(request.params.id);
  const result = await createSecurityScan({
    stage: SecurityScanStage.INITIAL_SCAN,
    protectedServiceId: serviceId
  });
  await prisma.auditLog.create({
    data: {
      userId: request.admin!.id,
      action: "INITIAL_SECURITY_SCAN_STARTED",
      resourceType: "ProtectedService",
      resourceId: serviceId,
      metadata: { scanRunId: result.scan.id, jobId: result.job.jobId }
    }
  });
  response.status(202).json(createSuccessResponse(result));
};

export const getValidation: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getValidationRun(String(request.params.id))));
};

export const getDeployments: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await listDeployments()));
};

export const getAuditLogs: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await prisma.auditLog.findMany({
        where: {
          action: request.query.action as string | undefined,
          resourceType: request.query.resourceType as string | undefined,
          resourceId: request.query.resourceId as string | undefined
        },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(request.query.limit ?? 50), 100)
      })
    )
  );
};

export const getAiStatus: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await getAiRuntimeStatus()));
};

export const createReport: RequestHandler = async (request, response) => {
  if (env.queueEnabled) {
    response
      .status(202)
      .json(
        createSuccessResponse(
          await enqueueSecurityJob("generate-report", { ruleId: request.body.ruleId })
        )
      );
    return;
  }
  response.status(201).json(createSuccessResponse(await generateReport(request.body.ruleId)));
};

export const getJob: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getJobStatus(String(request.params.id))));
};

export const getDashboard: RequestHandler = async (request, response) => {
  const requestedServiceId = request.query.serviceId as string | undefined;
  const service = requestedServiceId
    ? await prisma.protectedService.findUnique({ where: { id: requestedServiceId } })
    : await prisma.protectedService.findFirst({
        where: { status: { not: "DISABLED" } },
        orderBy: { createdAt: "asc" }
      });
  const serviceWhere = service
    ? { protectedServiceId: service.id }
    : { protectedServiceId: "__none__" };
  const [requestCount, blockedCount, activeRuleCount, latestValidation, initialScan, latestRule] =
    await Promise.all([
      prisma.requestEvent.count({ where: serviceWhere }),
      prisma.enforcementResult.count({
        where: { action: "BLOCK", requestEvent: serviceWhere }
      }),
      prisma.signatureRule.count({ where: { ...serviceWhere, status: "ACTIVE" } }),
      prisma.validationRun.findFirst({
        where: { rule: serviceWhere },
        orderBy: { createdAt: "desc" }
      }),
      prisma.securityScanRun.findFirst({
        where: { ...serviceWhere, stage: "INITIAL_SCAN", status: "COMPLETED" },
        orderBy: { completedAt: "desc" }
      }),
      prisma.signatureRule.findFirst({ where: serviceWhere, orderBy: { updatedAt: "desc" } })
    ]);
  const aggregate = await prisma.signatureRule.aggregate({
    where: serviceWhere,
    _avg: { confidence: true }
  });
  const nextAction = !service
    ? "REGISTER_SERVICE"
    : service.status !== "CONNECTED"
      ? "TEST_CONNECTION"
      : !initialScan
        ? "RUN_INITIAL_SCAN"
        : !latestRule
          ? "REVIEW_ATTACK_EVENTS"
          : ["DRAFT", "REVIEW_REQUIRED"].includes(latestRule.status)
            ? "VALIDATE_RULE"
            : latestRule.status === "HOLDOUT_PASSED"
              ? "REVIEW_AI_REPORT"
              : latestRule.status === "SHADOW_MODE"
                ? "REVIEW_SHADOW"
                : latestRule.status === "APPROVAL_REQUIRED"
                  ? "APPROVE_RULE"
                  : latestRule.status === "APPROVED"
                    ? "DEPLOY_ACTIVE"
                    : latestRule.status === "ACTIVE"
                      ? "VIEW_PROTECTION_RESULT"
                      : "REVIEW_RULE";
  response.json(
    createSuccessResponse({
      service,
      requestCount,
      blockedCount,
      activeRuleCount,
      averageConfidence: aggregate._avg.confidence ?? 0,
      latestValidation,
      initialScan,
      latestRule,
      nextAction
    })
  );
};
