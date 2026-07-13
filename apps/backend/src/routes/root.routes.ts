import { Router } from "express";
import { getApiGuide } from "../controllers/root.controller.js";

export const rootRouter = Router();

/**
 * @openapi
 * /:
 *   get:
 *     summary: Show backend guide links
 *     tags:
 *       - Root
 *     responses:
 *       200:
 *         description: Backend guide response.
 */
rootRouter.get("/", getApiGuide);
