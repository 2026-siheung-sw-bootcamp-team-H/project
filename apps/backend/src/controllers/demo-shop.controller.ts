import type { RequestHandler } from "express";
import { demoProducts } from "../data/demo-products.js";
import { captureRequestEvent } from "../services/request-event.service.js";
import { AppError } from "../utils/app-error.js";
import { createSuccessResponse } from "../utils/api-response.js";

export const listProducts: RequestHandler = async (request, response) => {
  const id = typeof request.query.id === "string" ? request.query.id : undefined;
  const product = id ? demoProducts.find((item) => item.id === id) : undefined;
  const status = id && !product ? 404 : 200;
  const captured = await captureRequestEvent(request, { responseStatus: status });
  if (captured.blocked) {
    response.status(403).json({
      error: { message: "보안 정책에 의해 요청이 차단되었습니다.", requestId: captured.event.id }
    });
    return;
  }
  if (id && !product) throw new AppError("상품을 찾을 수 없습니다.", 404, "PRODUCT_NOT_FOUND");
  response.json(
    createSuccessResponse({
      data: id ? product : demoProducts,
      requestId: captured.event.id,
      blocked: false
    })
  );
};

export const searchProducts: RequestHandler = async (request, response) => {
  const query = String(request.query.q ?? "")
    .trim()
    .toLowerCase();
  const captured = await captureRequestEvent(request, { responseStatus: 200 });
  if (captured.blocked) {
    response
      .status(403)
      .json(createSuccessResponse({ data: [], requestId: captured.event.id, blocked: true }));
    return;
  }
  const products = captured.category
    ? []
    : demoProducts.filter((product) =>
        [product.name, product.englishName, product.description, product.category]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
  response.json(
    createSuccessResponse({ data: products, requestId: captured.event.id, blocked: false })
  );
};

export const createReview: RequestHandler = async (request, response) => {
  const captured = await captureRequestEvent(request, { responseStatus: 201 });
  if (captured.blocked) {
    response
      .status(403)
      .json(
        createSuccessResponse({ accepted: false, blocked: true, requestId: captured.event.id })
      );
    return;
  }
  response
    .status(201)
    .json(createSuccessResponse({ accepted: true, blocked: false, requestId: captured.event.id }));
};

export const shopLogin: RequestHandler = async (request, response) => {
  const success =
    request.body.email === "shopper@demo.local" && request.body.password === "shop1234";
  const captured = await captureRequestEvent(request, { responseStatus: success ? 200 : 401 });
  if (captured.blocked) {
    response.status(403).json({
      error: { message: "보안 정책에 의해 요청이 차단되었습니다.", requestId: captured.event.id }
    });
    return;
  }
  if (!success)
    throw new AppError("이메일 또는 비밀번호가 올바르지 않습니다.", 401, "SHOP_LOGIN_FAILED");
  response.json(
    createSuccessResponse({
      customer: { name: "데모 쇼퍼", email: request.body.email },
      requestId: captured.event.id
    })
  );
};
