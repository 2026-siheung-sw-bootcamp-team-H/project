import he from "he";

const maxDecodeRounds = 4;
const maxInputLength = 32_768;
const maxTokens = 256;

export type NormalizationStep = {
  name: string;
  changed: boolean;
};

export type NormalizationResult = {
  normalizedQuery: string;
  normalizedBody: string;
  normalizedPath: string;
  normalizedHeaders: string;
  commentCollapsed: string;
  normalizationSteps: NormalizationStep[];
  tokens: string[];
  status: "normalized" | "normalization_error";
  errorStep?: string;
};

function stableString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(stableString).join(" ");
  if (typeof value === "object") {
    return Object.entries(value)
      .flatMap(([key, item]) => [key, stableString(item)])
      .join(" ");
  }
  return String(value);
}

function decodeUrlBounded(value: string): string {
  let result = value.replace(/\+/g, " ");
  for (let round = 0; round < maxDecodeRounds; round += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch {
      break;
    }
  }
  return result;
}

function normalizePart(value: unknown, steps: NormalizationStep[]): string {
  let current = stableString(value).slice(0, maxInputLength);
  const apply = (name: string, transform: (input: string) => string) => {
    const next = transform(current);
    steps.push({ name, changed: next !== current });
    current = next;
  };

  apply("url_decode", decodeUrlBounded);
  apply("html_entity_decode", (input) => he.decode(input));
  apply("unicode_nfkc", (input) => input.normalize("NFKC"));
  apply("lowercase", (input) => input.toLowerCase());
  apply("whitespace_collapse", (input) => input.replace(/[\t\r\n ]+/g, " ").trim());
  return current;
}

export function normalizePayload(
  query: unknown,
  body: unknown,
  path: unknown = "",
  headers: unknown = {}
): NormalizationResult {
  const steps: NormalizationStep[] = [];
  try {
    const normalizedQuery = normalizePart(query, steps);
    const normalizedBody = normalizePart(body, steps);
    const normalizedPath = normalizePart(path, steps);
    const normalizedHeaders = normalizePart(headers, steps);
    const combined =
      `${normalizedQuery} ${normalizedBody} ${normalizedPath} ${normalizedHeaders}`.trim();
    const commentCollapsed = combined
      .replace(/\/\*[\s\S]{0,2048}?\*\//g, "")
      .replace(/--[^\r\n]*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const tokens = Array.from(
      new Set(commentCollapsed.match(/[\p{L}\p{N}_./:'"=-]+/gu) ?? [])
    ).slice(0, maxTokens);

    return {
      normalizedQuery,
      normalizedBody,
      normalizedPath,
      normalizedHeaders,
      commentCollapsed,
      normalizationSteps: steps,
      tokens,
      status: "normalized"
    };
  } catch (error) {
    return {
      normalizedQuery: stableString(query).slice(0, maxInputLength),
      normalizedBody: stableString(body).slice(0, maxInputLength),
      normalizedPath: stableString(path).slice(0, maxInputLength),
      normalizedHeaders: stableString(headers).slice(0, maxInputLength),
      commentCollapsed: "",
      normalizationSteps: steps,
      tokens: [],
      status: "normalization_error",
      errorStep: error instanceof Error ? error.message : "unknown"
    };
  }
}
