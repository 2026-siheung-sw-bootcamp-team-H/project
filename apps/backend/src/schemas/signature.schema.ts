import { z } from "zod";

export const attackCategorySchema = z.enum(["SQL_INJECTION", "XSS", "PATH_TRAVERSAL"]);

const leafConditionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("keyword_sequence"),
      values: z.array(z.string().min(1).max(64)).min(1).max(20)
    })
    .strict(),
  z
    .object({
      type: z.literal("special_character_density"),
      threshold: z.number().min(0).max(1)
    })
    .strict(),
  z
    .object({
      type: z.literal("html_tag_with_event_handler"),
      tags: z
        .array(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/i))
        .min(1)
        .max(20),
      attributes: z
        .array(z.string().regex(/^[a-z][a-z0-9-]{0,31}$/i))
        .min(1)
        .max(20)
    })
    .strict(),
  z
    .object({
      type: z.literal("javascript_scheme"),
      values: z.array(z.string().min(1).max(64)).min(1).max(20)
    })
    .strict(),
  z.object({ type: z.literal("path_traversal_pattern") }).strict()
]);

export type MatchLeafCondition = z.infer<typeof leafConditionSchema>;
export type MatchGroup = {
  operator: "all" | "any";
  conditions: MatchCondition[];
};
export type MatchCondition = MatchLeafCondition | MatchGroup;

export const matchConditionSchema: z.ZodType<MatchCondition> = z.lazy(() =>
  z.union([leafConditionSchema, matchGroupSchema])
);

export const matchGroupSchema: z.ZodType<MatchGroup> = z
  .object({
    operator: z.enum(["all", "any"]),
    conditions: z.array(matchConditionSchema).min(1).max(20)
  })
  .strict();

export const signatureDefinitionSchema = z
  .object({
    id: z.string().regex(/^SIG-[A-Z]+-\d{3,}$/),
    version: z.number().int().positive(),
    category: attackCategorySchema,
    target: z.array(z.enum(["query", "body", "path", "headers"])).min(1),
    normalizers: z
      .array(z.enum(["url_decode", "html_entity_decode", "unicode_nfkc", "lowercase"]))
      .max(8),
    match: matchGroupSchema,
    action: z.enum(["block", "monitor"])
  })
  .strict();

export type SignatureDefinition = z.infer<typeof signatureDefinitionSchema>;

export function measureDefinitionComplexity(definition: SignatureDefinition) {
  let leafCount = 0;
  let maxDepth = 0;
  let literalCharacters = 0;

  const visit = (condition: MatchCondition, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if ("operator" in condition) {
      condition.conditions.forEach((child) => visit(child, depth + 1));
      return;
    }
    leafCount += 1;
    if ("values" in condition) {
      literalCharacters += condition.values.reduce((sum, value) => sum + value.length, 0);
    }
    if (condition.type === "html_tag_with_event_handler") {
      literalCharacters += [...condition.tags, ...condition.attributes].reduce(
        (sum, value) => sum + value.length,
        0
      );
    }
  };

  visit(definition.match, 1);
  return { leafCount, maxDepth, literalCharacters };
}

export function assertSafeDefinition(definition: SignatureDefinition): SignatureDefinition {
  const complexity = measureDefinitionComplexity(definition);
  if (complexity.leafCount > 30 || complexity.maxDepth > 4 || complexity.literalCharacters > 1024) {
    throw new Error("Signature definition exceeds the allowed complexity budget.");
  }
  return definition;
}
