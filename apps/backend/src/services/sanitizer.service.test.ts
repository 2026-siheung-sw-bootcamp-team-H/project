import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { sanitizeRequest } from "./sanitizer.service.js";

describe("sanitizeRequest", () => {
  it("redacts secrets while preserving attack syntax needed for replay", () => {
    const headers = {
      authorization: "Bearer secret",
      cookie: "session=secret",
      "content-type": "application/json",
      "user-agent": "test"
    };
    const request = {
      method: "POST",
      path: "/demo-shop/login",
      query: {},
      body: { email: "admin@example.com", password: "1' OR 1=1", note: "<svg onload=x>" },
      headers,
      ip: "127.0.0.1",
      header(name: string) {
        return headers[name.toLowerCase() as keyof typeof headers];
      }
    } as unknown as Request;

    const result = sanitizeRequest(request);
    expect(result.headers).not.toHaveProperty("authorization");
    expect(result.headers).not.toHaveProperty("cookie");
    expect(result.bodyPreview).not.toContain("1' OR 1=1");
    expect(result.bodyPreview).toContain("[REDACTED]");
    expect(result.bodyPreview).toContain("<svg onload=x>");
    expect(JSON.stringify(result.analysisBody)).toContain("1' OR 1=1");
    expect(result.ipFingerprint).not.toContain("127.0.0.1");
  });
});
