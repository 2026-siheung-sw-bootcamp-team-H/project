import type {
  MatchCondition,
  MatchGroup,
  MatchLeafCondition,
  SignatureDefinition
} from "../schemas/signature.schema.js";
import type { NormalizationResult } from "./normalizer.service.js";

export type DetectorResult = {
  matched: boolean;
  reasons: string[];
  conditionResults: boolean[];
};

function orderedKeywordsMatch(haystack: string, values: string[]): boolean {
  let offset = 0;
  return values.every((value) => {
    const index = haystack.indexOf(value.toLowerCase(), offset);
    if (index === -1) return false;
    offset = index + value.length;
    return true;
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGroup(condition: MatchCondition): condition is MatchGroup {
  return "operator" in condition;
}

function evaluateLeaf(condition: MatchLeafCondition, text: string): [boolean, string] {
  switch (condition.type) {
    case "keyword_sequence": {
      const matched = orderedKeywordsMatch(text, condition.values);
      return [matched, `keyword_sequence:${condition.values.join("→")}`];
    }
    case "special_character_density": {
      const specialCount = (text.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
      const density = text.length === 0 ? 0 : specialCount / text.length;
      return [density >= condition.threshold, `special_character_density:${density.toFixed(3)}`];
    }
    case "html_tag_with_event_handler": {
      const tagPattern = condition.tags.map(escapeRegex).join("|");
      const attributePattern = condition.attributes.map(escapeRegex).join("|");
      const matched = new RegExp(
        `<\\s*(?:${tagPattern})\\b[^>]{0,512}(?:${attributePattern})\\s*=`,
        "i"
      ).test(text);
      return [matched, "html_tag_with_event_handler"];
    }
    case "javascript_scheme": {
      const matched = condition.values.some((value) => text.includes(value.toLowerCase()));
      return [matched, "javascript_scheme"];
    }
    case "path_traversal_pattern": {
      const matched = /(?:^|[\\/])\.\.(?:[\\/]|$)|\.\.%2f|%2e%2e/i.test(text);
      return [matched, "path_traversal_pattern"];
    }
  }
}

function evaluateCondition(condition: MatchCondition, text: string): [boolean, string[]] {
  if (!isGroup(condition)) {
    const [matched, reason] = evaluateLeaf(condition, text);
    return [matched, matched ? [reason] : []];
  }
  const children = condition.conditions.map((child) => evaluateCondition(child, text));
  const matched =
    condition.operator === "all"
      ? children.every(([childMatched]) => childMatched)
      : children.some(([childMatched]) => childMatched);
  return [matched, matched ? children.flatMap(([, reasons]) => reasons) : []];
}

export function evaluateSignature(
  definition: SignatureDefinition,
  normalized: NormalizationResult
): DetectorResult {
  const sources = {
    query: normalized.normalizedQuery,
    body: normalized.normalizedBody,
    path: normalized.normalizedPath,
    headers: normalized.normalizedHeaders
  };
  const selected = definition.target.map((target) => sources[target]).join(" ");
  const text = `${selected} ${selected
    .replace(/\/\*[\s\S]{0,2048}?\*\//g, "")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")}`;
  const childResults = definition.match.conditions.map((condition) =>
    evaluateCondition(condition, text)
  );
  const [matched, reasons] = evaluateCondition(definition.match, text);
  return { matched, reasons, conditionResults: childResults.map(([result]) => result) };
}
