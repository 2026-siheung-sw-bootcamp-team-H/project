import { AttackCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { generateAdversarialVariants } from "./adversarial.service.js";
import { normalizePayload } from "./normalizer.service.js";
import { buildDeterministicRefinement, shouldAdoptCandidate } from "./refinement.service.js";
import { buildRuleDefinition } from "./rule-generator.service.js";
import { evaluateSignature } from "./signature-detector.service.js";

describe("adversarial refinement", () => {
  it("hardens a SQL injection rule against a surviving boolean-operator bypass", () => {
    const initial = buildRuleDefinition(AttackCategory.SQL_INJECTION, "SIG-SQLI-001");
    const bypass = normalizePayload({ q: "1' AND 2=2--" }, {});
    expect(evaluateSignature(initial, bypass).matched).toBe(false);

    const hardened = buildDeterministicRefinement(initial, 2);
    expect(hardened).not.toBeNull();
    expect(evaluateSignature(hardened!, bypass).matched).toBe(true);
  });

  it("hardens an XSS rule one adversarial family at a time", () => {
    const initial = buildRuleDefinition(AttackCategory.XSS, "SIG-XSS-001");
    const bypass = normalizePayload({}, { content: "<iframe srcdoc=alert(1)>" });
    expect(evaluateSignature(initial, bypass).matched).toBe(false);

    const hardened = buildDeterministicRefinement(initial, 2);
    expect(evaluateSignature(hardened!, bypass).matched).toBe(true);
  });

  it("only adopts candidates that reduce bypasses without detection or false-positive regression", () => {
    const baseline = { attackDetectionRate: 0.8, falsePositiveRate: 0, bypassSuccessRate: 0.4 };
    expect(
      shouldAdoptCandidate(baseline, {
        attackDetectionRate: 0.8,
        falsePositiveRate: 0,
        bypassSuccessRate: 0.2,
        averageLatencyMs: 1
      })
    ).toBe(true);
    expect(
      shouldAdoptCandidate(baseline, {
        attackDetectionRate: 1,
        falsePositiveRate: 0.1,
        bypassSuccessRate: 0.1,
        averageLatencyMs: 1
      })
    ).toBe(false);
  });

  it("expands the adversarial set over later rounds", () => {
    const first = generateAdversarialVariants("1' OR 1=1--", AttackCategory.SQL_INJECTION, 1);
    const third = generateAdversarialVariants("1' OR 1=1--", AttackCategory.SQL_INJECTION, 3);
    expect(third.length).toBeGreaterThan(first.length);
    expect(third.some((sample) => sample.strategy === "benchmark_function")).toBe(true);
  });
});
