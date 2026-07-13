import type { RequestHandler } from "express";
import { createSuccessResponse } from "../utils/api-response.js";

export const getApiGuide: RequestHandler = (_request, response) => {
  response.json(
    createSuccessResponse({
      message: "Siheung backend is running.",
      docs: "/api-docs",
      health: "/api/health"
    })
  );
};
