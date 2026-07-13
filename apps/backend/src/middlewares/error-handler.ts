import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import type { ApiErrorResponse } from "../types/api.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      error: {
        message: "Invalid request.",
        issues: error.issues
      }
    };

    response.status(400).json(errorResponse);
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";

  const errorResponse: ApiErrorResponse = {
    error: {
      message
    }
  };

  response.status(500).json(errorResponse);
};
