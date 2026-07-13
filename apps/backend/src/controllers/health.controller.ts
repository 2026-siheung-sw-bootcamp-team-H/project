import type { RequestHandler } from "express";
import { getHealthStatus } from "../services/health.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const getHealth: RequestHandler = (_request, response) => {
  response.json(createSuccessResponse(getHealthStatus()));
};
