import { AttackCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { normalizePayload } from "./normalizer.service.js";
import { buildRuleDefinition } from "./rule-generator.service.js";
import { evaluateSignature } from "./signature-detector.service.js";

describe("evaluateSignature", () => {
  it("detects an encoded and comment-obfuscated SQL injection", () => {
    const definition = buildRuleDefinition(AttackCategory.SQL_INJECTION, "SIG-SQLI-001");
    const normalized = normalizePayload({ q: "1' UN/**/ION SEL/**/ECT password FROM users--" }, {});
    expect(evaluateSignature(definition, normalized).matched).toBe(true);
  });

  it("does not flag a normal phrase containing union and select", () => {
    const definition = buildRuleDefinition(AttackCategory.SQL_INJECTION, "SIG-SQLI-001");
    const normalized = normalizePayload({ q: "union select 기초 강의" }, {});
    expect(evaluateSignature(definition, normalized).matched).toBe(false);
  });

  it("supports nested all and any conditions", () => {
    const definition = buildRuleDefinition(AttackCategory.XSS, "SIG-XSS-001");
    const attack = normalizePayload({}, { content: "<svg onload=alert(1)>" });
    const normal = normalizePayload({}, { content: "SVG 아이콘 상품" });
    expect(evaluateSignature(definition, attack).matched).toBe(true);
    expect(evaluateSignature(definition, normal).matched).toBe(false);
  });

  it("evaluates only the targets selected by a rule", () => {
    const definition = buildRuleDefinition(AttackCategory.PATH_TRAVERSAL, "SIG-PATH-001");
    const attack = normalizePayload({}, {}, "/files/../../etc/passwd");
    expect(evaluateSignature(definition, attack).matched).toBe(true);

    const queryOnly = { ...definition, target: ["query"] as const };
    expect(evaluateSignature(queryOnly, attack).matched).toBe(false);
  });
});
