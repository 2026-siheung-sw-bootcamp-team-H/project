import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import type { ApiErrorResponse } from "../types/api.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: { message: "요청 형식이 올바르지 않습니다.", issues: error.issues }
    } satisfies ApiErrorResponse);
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: { message: error.message, code: error.code, issues: error.details }
    } satisfies ApiErrorResponse);
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      message:
        env.nodeEnv === "production"
          ? "Internal server error"
          : error instanceof Error
            ? error.message
            : "Internal server error"
    }
  } satisfies ApiErrorResponse);
};
