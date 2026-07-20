import { AttackCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { parseAiAdversarialSamples, parseAiRuleRefinement } from "./ai.service.js";
import { buildRuleDefinition } from "./rule-generator.service.js";

describe("AI rule refinement boundary", () => {
  it("forces identity, category, version, and monitor action at the trust boundary", () => {
    const current = buildRuleDefinition(AttackCategory.SQL_INJECTION, "SIG-SQLI-001");
    const untrusted = JSON.stringify({
      rationale: "narrow boolean bypass hardening",
      definition: {
        ...current,
        id: "ATTACKER-CONTROLLED",
        version: 999,
        category: "XSS",
        action: "block"
      }
    });
    const parsed = parseAiRuleRefinement(untrusted, current, 2, "openai");
    expect(parsed.definition).toMatchObject({
      id: "SIG-SQLI-001",
      version: 2,
      category: "SQL_INJECTION",
      action: "monitor"
    });
  });

  it("rejects unsupported AI condition types", () => {
    const current = buildRuleDefinition(AttackCategory.XSS, "SIG-XSS-001");
    const invalid = JSON.stringify({
      rationale: "unsafe regex",
      definition: {
        ...current,
        match: { operator: "any", conditions: [{ type: "arbitrary_regex", value: ".*" }] }
      }
    });
    expect(() => parseAiRuleRefinement(invalid, current, 2, "openai")).toThrow();
  });

  it("bounds and deduplicates structured AI adversarial payloads", () => {
    const samples = parseAiAdversarialSamples(
      JSON.stringify({
        samples: [
          { strategy: "double_encode", value: "%2527%2520OR%25201%253D1" },
          { strategy: "duplicate", value: "%2527%2520OR%25201%253D1" }
        ]
      })
    );
    expect(samples).toHaveLength(1);
    expect(samples[0]?.strategy).toBe("double_encode");
  });

  it("rejects oversized AI adversarial payloads", () => {
    expect(() =>
      parseAiAdversarialSamples(
        JSON.stringify({ samples: [{ strategy: "oversized", value: "x".repeat(4097) }] })
      )
    ).toThrow();
  });
});
