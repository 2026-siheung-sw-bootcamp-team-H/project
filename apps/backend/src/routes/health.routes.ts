import { Router } from "express";

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
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: "@siheung/backend"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
healthRouter.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "@siheung/backend",
    timestamp: new Date().toISOString()
  });
});
