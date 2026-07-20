import type { SignatureDefinition } from "../schemas/signature.schema.js";
import { assertSafeDefinition, signatureDefinitionSchema } from "../schemas/signature.schema.js";

function hasKeywordSequence(definition: SignatureDefinition, values: string[]): boolean {
  const expected = values.join("\u0000");
  const visit = (
    condition: SignatureDefinition["match"] | SignatureDefinition["match"]["conditions"][number]
  ): boolean => {
    if ("operator" in condition) return condition.conditions.some(visit);
    return condition.type === "keyword_sequence" && condition.values.join("\u0000") === expected;
  };
  return visit(definition.match);
}

export function buildDeterministicRefinement(
  current: SignatureDefinition,
  nextVersion: number
): SignatureDefinition | null {
  const candidate = structuredClone(current);
  candidate.version = nextVersion;

  if (candidate.category === "SQL_INJECTION") {
    const additions: Array<[string[], number]> = [
      [["and", "="], 0.03],
      [["sleep", "("], 0.03],
      [["benchmark", "("], 0.03]
    ];
    const next = additions.find(([values]) => !hasKeywordSequence(candidate, values));
    if (!next) return null;
    candidate.match.conditions.push({
      operator: "all",
      conditions: [
        { type: "keyword_sequence", values: next[0] },
        { type: "special_character_density", threshold: next[1] }
      ]
    });
  } else if (candidate.category === "XSS") {
    const condition = candidate.match.conditions.find(
      (item) => !("operator" in item) && item.type === "html_tag_with_event_handler"
    );
    if (!condition || "operator" in condition || condition.type !== "html_tag_with_event_handler") {
      return null;
    }
    const additions = [
      { tag: "iframe", attribute: "srcdoc" },
      { tag: "body", attribute: "onpageshow" },
      { tag: "details", attribute: "ontoggle" }
    ];
    const next = additions.find(
      ({ tag, attribute }) =>
        !condition.tags.includes(tag) || !condition.attributes.includes(attribute)
    );
    if (!next) return null;
    condition.tags = Array.from(new Set([...condition.tags, next.tag]));
    condition.attributes = Array.from(new Set([...condition.attributes, next.attribute]));
  } else {
    return null;
  }

  return assertSafeDefinition(signatureDefinitionSchema.parse(candidate));
}

export function shouldAdoptCandidate(
  baseline: { attackDetectionRate: number; falsePositiveRate: number; bypassSuccessRate: number },
  candidate: {
    attackDetectionRate: number;
    falsePositiveRate: number;
    bypassSuccessRate: number;
    averageLatencyMs: number;
  }
): boolean {
  const noDetectionRegression = candidate.attackDetectionRate >= baseline.attackDetectionRate;
  const noFalsePositiveRegression = candidate.falsePositiveRate <= baseline.falsePositiveRate;
  const bypassImproved = candidate.bypassSuccessRate < baseline.bypassSuccessRate;
  const latencySafe = candidate.averageLatencyMs <= 20;
  return noDetectionRegression && noFalsePositiveRegression && bypassImproved && latencySafe;
}
