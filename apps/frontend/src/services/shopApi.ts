import { products } from "@/data/shopData";
import { requestLogs, signatureRules } from "@/data/mockData";
import { queryClient } from "@/lib/queryClient";
import type { AttackCategory, RequestLog } from "@/types/domain";
import type { Product, ShopRequestResult } from "@/types/shop";

const delay = (milliseconds = 220) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function analyze(value: string): AttackCategory | null {
  let decoded = value.replace(/\+/g, " ").toLowerCase();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Malformed encoding is evaluated as-is and remains visible in the security log.
  }
  if (/union\s*(?:\/\*.*?\*\/\s*)?select|or\s+['\d].*?=.*?['\d]/i.test(decoded)) {
    return "SQL_INJECTION";
  }
  if (/<\s*(script|img|svg)|on(error|load|click)\s*=|javascript:/i.test(decoded)) {
    return "XSS";
  }
  if (/\.\.\/|\.\.\\|%2e%2e/i.test(value)) return "PATH_TRAVERSAL";
  return null;
}

function recordRequest({
  method,
  path,
  body = "",
  category = null,
  blocked = false,
  statusCode = 200
}: {
  method: "GET" | "POST";
  path: string;
  body?: string;
  category?: AttackCategory | null;
  blocked?: boolean;
  statusCode?: number;
}) {
  const id = `log-shop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const rawRequest = `${method} ${path} HTTP/1.1\nHost: demo-shop.local\nUser-Agent: DemoShop Browser${body ? `\nContent-Type: application/json\n\n${body}` : ""}`;
  let normalized = `${path} ${body}`.toLowerCase();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Preserve malformed input for operator review.
  }
  normalized = normalized.replace(/[^a-z0-9가-힣./]+/g, " ");
  const log: RequestLog = {
    id,
    occurredAt: new Date().toISOString(),
    method,
    path,
    ip: "127.0.0.1",
    userAgent: "DemoShop Browser",
    classification: category ? "attack" : "normal",
    action: blocked ? "blocked" : "allowed",
    attackCategory: category,
    rawRequest,
    normalizedRequest: normalized.trim(),
    tokens: normalized
      .split(/\s+/)
      .filter((token) => token.length > 2)
      .slice(0, 10),
    statusCode: blocked ? 403 : statusCode
  };
  requestLogs.unshift(log);
  void queryClient.invalidateQueries({ queryKey: ["logs"] });
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  return id;
}

function isBlocked(category: AttackCategory | null) {
  return Boolean(
    category &&
      signatureRules.some((rule) => rule.category === category && rule.status === "active")
  );
}

export const shopApi = {
  async getProducts(): Promise<ShopRequestResult<Product[]>> {
    await delay();
    const requestId = recordRequest({ method: "GET", path: "/demo-shop/products" });
    return { data: products, requestId, blocked: false };
  },

  async getProduct(id: string): Promise<ShopRequestResult<Product>> {
    await delay();
    const category = analyze(id);
    const blocked = isBlocked(category);
    const requestId = recordRequest({
      method: "GET",
      path: `/demo-shop/products?id=${encodeURIComponent(id)}`,
      category,
      blocked,
      statusCode: products.some((product) => product.id === id) ? 200 : 404
    });
    if (blocked) throw new Error(`WAF가 요청을 차단했습니다. Request ID: ${requestId}`);
    const product = products.find((item) => item.id === id);
    if (!product) throw new Error("상품을 찾을 수 없습니다.");
    return { data: product, requestId, blocked: false };
  },

  async search(query: string): Promise<ShopRequestResult<Product[]>> {
    await delay(320);
    const category = analyze(query);
    const blocked = isBlocked(category);
    const requestId = recordRequest({
      method: "GET",
      path: `/demo-shop/search?q=${encodeURIComponent(query)}`,
      category,
      blocked
    });
    if (blocked) return { data: [], requestId, blocked: true };
    const normalizedQuery = query.trim().toLowerCase();
    const data = category
      ? []
      : products.filter((product) =>
          [product.name, product.englishName, product.description, product.category]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        );
    return { data, requestId, blocked: false };
  },

  async login(email: string, password: string) {
    await delay(350);
    const category = analyze(`${email} ${password}`);
    const blocked = isBlocked(category);
    const success = email === "shopper@demo.local" && password === "shop1234";
    const requestId = recordRequest({
      method: "POST",
      path: "/demo-shop/login",
      body: JSON.stringify({ email, password: "••••••••" }),
      category,
      blocked,
      statusCode: success ? 200 : 401
    });
    if (blocked) throw new Error(`보안 정책에 의해 요청이 차단되었습니다. ${requestId}`);
    if (!success) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    return { customer: { name: "데모 쇼퍼", email }, requestId };
  },

  async createReview(productId: string, content: string) {
    await delay(350);
    const category = analyze(content);
    const blocked = isBlocked(category);
    const requestId = recordRequest({
      method: "POST",
      path: "/demo-shop/reviews",
      body: JSON.stringify({ productId, content }),
      category,
      blocked,
      statusCode: 201
    });
    if (blocked) return { accepted: false, blocked: true, requestId };
    return { accepted: true, blocked: false, requestId };
  }
};
