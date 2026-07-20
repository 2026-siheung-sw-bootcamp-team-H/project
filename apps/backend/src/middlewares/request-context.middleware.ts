import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.header("x-request-id");
  const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
  const startedAt = performance.now();
  response.setHeader("x-request-id", requestId);

  response.once("finish", () => {
    console.log(
      JSON.stringify({
        type: "http_request",
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Number((performance.now() - startedAt).toFixed(2))
      })
    );
  });
  next();
};
