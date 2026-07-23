import { AttackCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildDeterministicRefinement } from "./refinement.service.js";
import { buildRuleDefinition } from "./rule-generator.service.js";
import { exportModSecurityRule } from "./waf-export.service.js";

describe("exportModSecurityRule", () => {
  it("exports shadow and active actions with a numeric unique id", () => {
    const definition = buildRuleDefinition(AttackCategory.XSS, "SIG-XSS-001");
    const shadow = exportModSecurityRule(definition, "shadow");
    const active = exportModSecurityRule(definition, "active");
    expect(shadow).toMatch(/id:\d+/);
    expect(shadow).toContain("pass,log");
    expect(active).toContain("deny,status:403,log");
  });

  it("exports hardened XSS tags and attributes from the accepted definition", () => {
    const initial = buildRuleDefinition(AttackCategory.XSS, "SIG-XSS-001");
    const hardened = buildDeterministicRefinement(initial, 2)!;
    const rule = exportModSecurityRule(hardened, "active");
    expect(rule).toContain("iframe");
    expect(rule).toContain("srcdoc");
    expect(rule).toContain("ARGS_GET|ARGS_POST|REQUEST_BODY");
  });

  it("escapes double quotes inside the ModSecurity operator string", () => {
    const definition = buildRuleDefinition(AttackCategory.SQL_INJECTION, "SIG-SQLI-001");
    const rule = exportModSecurityRule(definition, "active");
    expect(rule).toContain("\\x22");
    expect(rule).not.toContain(`['"=()]`);
  });
});
