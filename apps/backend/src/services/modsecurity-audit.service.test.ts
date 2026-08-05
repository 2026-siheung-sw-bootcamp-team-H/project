import { describe, expect, it } from "vitest";
import { extractWafRuleMatches } from "./modsecurity-audit.service.js";

describe("extractWafRuleMatches", () => {
  it("extracts CRS and ANVIL rule attribution from a ModSecurity audit record", () => {
    const matches = extractWafRuleMatches({
      transaction: {
        messages: [
          {
            message: "SQL Injection Attack Detected",
            details: { ruleId: "942100", tags: ["OWASP_CRS", "attack-sqli"] }
          },
          {
            message: "SIG-SQLI-013 SQL_INJECTION",
            details: { ruleId: "8123401", tags: ["siheung-signature"] }
          }
        ]
      }
    });

    expect(matches).toEqual([
      {
        ruleId: "942100",
        message: "SQL Injection Attack Detected",
        tags: ["OWASP_CRS", "attack-sqli"]
      },
      {
        ruleId: "8123401",
        message: "SIG-SQLI-013 SQL_INJECTION",
        tags: ["siheung-signature"]
      }
    ]);
  });
});
