import type { RequestHandler } from "express";
import { loginAdmin } from "../services/auth.service.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const login: RequestHandler = async (request, response) => {
  const result = await loginAdmin(request.body.email, request.body.password);
  response.json(createSuccessResponse(result));
};
