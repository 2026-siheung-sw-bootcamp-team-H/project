import type { RequestHandler } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { verifyAdminToken } from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";

export const requireAdmin: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError("관리자 인증이 필요합니다.", 401, "AUTH_REQUIRED"));
    return;
  }

  try {
    const payload = verifyAdminToken(authorization.slice("Bearer ".length));
    request.admin = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireTelemetryToken: RequestHandler = (request, _response, next) => {
  const token = request.header("x-telemetry-token");
  const suppliedHash = createHash("sha256")
    .update(token ?? "")
    .digest();
  const expectedHash = createHash("sha256").update(env.telemetryToken).digest();
  if (!token || !timingSafeEqual(suppliedHash, expectedHash)) {
    next(new AppError("Telemetry 인증에 실패했습니다.", 401, "INVALID_TELEMETRY_TOKEN"));
    return;
  }
  next();
};
