export type WafRuleMatch = {
  ruleId: string;
  message: string | null;
  tags: string[];
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === "object" && value !== null ? (value as JsonObject) : {};
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((item) => asString(item)).filter((item): item is string => Boolean(item)))
  ];
}

export function extractWafRuleMatches(audit: JsonObject): WafRuleMatch[] {
  const transaction = asObject(audit.transaction);
  const rawMessages = [
    ...(Array.isArray(transaction.messages) ? transaction.messages : []),
    ...(Array.isArray(audit.messages) ? audit.messages : [])
  ];
  const matches = rawMessages.flatMap((rawMessage) => {
    const message = asObject(rawMessage);
    const details = asObject(message.details);
    const ruleId =
      asString(details.ruleId) ??
      asString(details.rule_id) ??
      asString(message.ruleId) ??
      asString(message.rule_id);
    if (!ruleId) return [];
    return [
      {
        ruleId,
        message: asString(message.message) ?? asString(details.message),
        tags: asTags(details.tags ?? message.tags)
      }
    ];
  });

  return [
    ...new Map(
      matches.map((match) => [
        `${match.ruleId}:${match.tags.join(",")}:${match.message ?? ""}`,
        match
      ])
    ).values()
  ];
}
