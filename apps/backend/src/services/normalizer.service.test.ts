import { describe, expect, it } from "vitest";
import { normalizePayload } from "./normalizer.service.js";

describe("normalizePayload", () => {
  it("decodes encoded SQL keywords with bounded rounds", () => {
    const result = normalizePayload(
      { q: "%2555%254e%2549%254f%254e/**/%2553%2545%254c%2545%2543%2554" },
      {}
    );
    expect(result.commentCollapsed).toContain("unionselect");
    expect(result.status).toBe("normalized");
  });

  it("decodes nested evasions within the bounded four-round limit", () => {
    const nested = encodeURIComponent(encodeURIComponent(encodeURIComponent("<svg onload=x>")));
    const result = normalizePayload({ q: nested }, {});
    expect(result.normalizedQuery).toContain("<svg onload=x>");
  });

  it("decodes HTML entities without replacing the sanitized input", () => {
    const input = "&lt;img src=x onerror=alert(1)&gt;";
    const result = normalizePayload({}, { content: input });
    expect(result.normalizedBody).toContain("<img");
    expect(input).toContain("&lt;");
  });
});
