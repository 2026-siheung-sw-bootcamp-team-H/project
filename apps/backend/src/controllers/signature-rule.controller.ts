import { DeploymentTargetType } from "@prisma/client";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { deployRule } from "../services/deployment.service.js";
import { enqueueSecurityJob } from "../services/job.service.js";
import {
  approveRule,
  generateRuleFromEvent,
  getSignatureRule,
  listSignatureRules,
  rejectRule,
  requestRuleApproval,
  validateSignatureRule
} from "../services/signature-rule.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const listRules: RequestHandler = async (_request, response) => {
  response.json(createSuccessResponse(await listSignatureRules()));
};

export const getRule: RequestHandler = async (request, response) => {
  response.json(createSuccessResponse(await getSignatureRule(String(request.params.id))));
};

export const generateRule: RequestHandler = async (request, response) => {
  response
    .status(201)
    .json(createSuccessResponse(await generateRuleFromEvent(request.body.requestEventId)));
};

export const validateRule: RequestHandler = async (request, response) => {
  if (env.queueEnabled) {
    response
      .status(202)
      .json(
        createSuccessResponse(
          await enqueueSecurityJob("validate-rule", { ruleId: String(request.params.id) })
        )
      );
    return;
  }
  response.json(createSuccessResponse(await validateSignatureRule(String(request.params.id))));
};

export const approve: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await approveRule(String(request.params.id), request.admin!.id, request.body.reason)
    )
  );
};

export const requestApproval: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(await requestRuleApproval(String(request.params.id), request.admin!.id))
  );
};

export const reject: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await rejectRule(String(request.params.id), request.admin!.id, request.body.reason)
    )
  );
};

export const deploy: RequestHandler = async (request, response) => {
  response.json(
    createSuccessResponse(
      await deployRule(
        String(request.params.id),
        request.body.mode,
        DeploymentTargetType[request.body.targetType as keyof typeof DeploymentTargetType],
        request.admin!.id
      )
    )
  );
};
