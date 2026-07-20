import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { login } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const authRouter = Router();

authRouter.post(
  "/login",
  rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }),
  validateRequest({ body: z.object({ email: z.email(), password: z.string().min(8).max(128) }) }),
  login
);
