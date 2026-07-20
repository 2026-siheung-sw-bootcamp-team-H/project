import { Router } from "express";
import { z } from "zod";
import {
  createReview,
  listProducts,
  searchProducts,
  shopLogin
} from "../controllers/demo-shop.controller.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

export const demoShopRouter = Router();

demoShopRouter.get(
  "/products",
  validateRequest({ query: z.object({ id: z.string().max(512).optional() }) }),
  listProducts
);
demoShopRouter.get(
  "/search",
  validateRequest({ query: z.object({ q: z.string().max(4096).default("") }) }),
  searchProducts
);
demoShopRouter.post(
  "/reviews",
  validateRequest({
    body: z.object({ productId: z.string().max(100), content: z.string().max(16_384) })
  }),
  createReview
);
demoShopRouter.post(
  "/login",
  validateRequest({
    body: z.object({ email: z.string().max(512), password: z.string().max(4096) })
  }),
  shopLogin
);
