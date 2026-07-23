import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found-handler.js";
import { requestContext } from "./middlewares/request-context.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { demoShopRouter } from "./routes/demo-shop.routes.js";
import { docsRouter } from "./routes/docs.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { platformRouter } from "./routes/platform.routes.js";
import { requestEventRouter } from "./routes/request-event.routes.js";
import { rootRouter } from "./routes/root.routes.js";
import { signatureRuleRouter } from "./routes/signature-rule.routes.js";
import { securityScanRouter } from "./routes/security-scan.routes.js";
import { telemetryRouter } from "./routes/telemetry.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.clientOrigin }));
  app.use(requestContext);
  app.use(express.json({ limit: env.maxCaptureBodyBytes }));

  app.use("/", rootRouter);
  app.use("/api-docs", docsRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/demo-shop", demoShopRouter);
  app.use("/api/request-events", requestEventRouter);
  app.use("/api/signature-rules", signatureRuleRouter);
  app.use("/api/security-scans", securityScanRouter);
  app.use("/api/telemetry", telemetryRouter);
  app.use("/api", platformRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
