import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger.js";

export const docsRouter = Router();

docsRouter.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
