import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { listDeployments } from "../services/deployment.service.js";
import { enqueueSecurityJob, getJobStatus } from "../services/job.service.js";
import { generateReport } from "../services/report.service.js";
import { getValidationRun } from "../services/validation.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const listProtectedServices: RequestHandler = async (_request, response) => {
  const services = await prisma.protectedService.findMany({
    include: {
      _count: { select: { requestEvents: true, rules: { where: { status: "ACTIVE" } } } },
      requestEvents: { orderBy: { occurredAt: "desc" }, take: 1 }
    }
  });
  response.json(createSuccessResponse(services));
};

export const getValidation: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getValidationRun(String(request.params.id))));
};

export const getDeployments: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await listDeployments()));
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

export const getDashboard: RequestHandler = async (_request, response) => {
  const [requestCount, blockedCount, activeRuleCount, latestValidation, service] =
    await Promise.all([
      prisma.requestEvent.count(),
      prisma.enforcementResult.count({ where: { action: "BLOCK" } }),
      prisma.signatureRule.count({ where: { status: "ACTIVE" } }),
      prisma.validationRun.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.protectedService.findFirst({ where: { slug: "demo-shop" } })
    ]);
  const aggregate = await prisma.signatureRule.aggregate({ _avg: { confidence: true } });
  response.json(
    createSuccessResponse({
      service,
      requestCount,
      blockedCount,
      activeRuleCount,
      averageConfidence: aggregate._avg.confidence ?? 0,
      latestValidation
    })
  );
};
