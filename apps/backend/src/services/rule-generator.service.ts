import { createHash } from "node:crypto";
import type { AttackCategory } from "@prisma/client";
import type { SignatureDefinition } from "../schemas/signature.schema.js";

const categoryPrefix: Record<AttackCategory, string> = {
  SQL_INJECTION: "SQLI",
  XSS: "XSS",
  PATH_TRAVERSAL: "PATH"
};

export function buildRuleDefinition(
  category: AttackCategory,
  externalId: string,
  version = 1
): SignatureDefinition {
  const common: Omit<SignatureDefinition, "match"> = {
    id: externalId,
    version,
    category,
    target: ["query", "body"] as Array<"query" | "body">,
    normalizers: ["url_decode", "html_entity_decode", "unicode_nfkc", "lowercase"],
    action: "monitor" as const
  };

  if (category === "SQL_INJECTION") {
    return {
      ...common,
      match: {
        operator: "any",
        conditions: [
          {
            operator: "all",
            conditions: [
              { type: "keyword_sequence", values: ["union", "select"] },
              { type: "special_character_density", threshold: 0.05 }
            ]
          },
          {
            operator: "all",
            conditions: [
              { type: "keyword_sequence", values: ["or", "="] },
              { type: "special_character_density", threshold: 0.03 }
            ]
          }
        ]
      }
    };
  }

  if (category === "XSS") {
    return {
      ...common,
      match: {
        operator: "any",
        conditions: [
          {
            type: "html_tag_with_event_handler",
            tags: ["script", "img", "svg"],
            attributes: ["onerror", "onload", "onclick"]
          },
          { type: "javascript_scheme", values: ["javascript:"] }
        ]
      }
    };
  }

  return {
    ...common,
    target: ["query", "body", "path"],
    match: { operator: "any", conditions: [{ type: "path_traversal_pattern" }] }
  };
}

export function makeExternalRuleId(category: AttackCategory, sequence: number): string {
  return `SIG-${categoryPrefix[category]}-${String(sequence).padStart(3, "0")}`;
}

export function hashDefinition(definition: SignatureDefinition): string {
  return createHash("sha256").update(JSON.stringify(definition)).digest("hex");
}
