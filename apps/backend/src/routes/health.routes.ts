import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";

export const healthRouter = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Check backend health
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     service:
 *                       type: string
 *                       example: "@siheung/backend"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
healthRouter.get("/", getHealth);
