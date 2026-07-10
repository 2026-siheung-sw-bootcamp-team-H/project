import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";

const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Siheung API",
      version: "0.1.0",
      description: "API documentation for the Siheung backend."
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? 4000}`,
        description: "Local backend server"
      }
    ]
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"]
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
