import type { RequestHandler } from "express";
import type { ApiErrorResponse } from "../types/api.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  const errorResponse: ApiErrorResponse = {
    error: {
      message: `Route not found: ${request.method} ${request.originalUrl}`
    }
  };

  response.status(404).json(errorResponse);
};
