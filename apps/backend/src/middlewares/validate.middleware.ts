import type { RequestHandler } from "express";
import { z } from "zod";

type RequestSchemas = Partial<{
  body: z.ZodType;
  params: z.ZodType;
  query: z.ZodType;
}>;

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    const result = z
      .object({
        body: schemas.body ?? z.any(),
        params: schemas.params ?? z.any(),
        query: schemas.query ?? z.any()
      })
      .safeParse({
        body: request.body,
        params: request.params,
        query: request.query
      });

    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data.body;
    request.params = result.data.params;
    // Express 5 exposes `query` as a getter. Validation still runs here, while
    // handlers read the original parsed query object instead of replacing it.
    next();
  };
}
