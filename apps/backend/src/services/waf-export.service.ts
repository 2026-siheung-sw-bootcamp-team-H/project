import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RuleStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import {
  signatureDefinitionSchema,
  type MatchCondition,
  type MatchLeafCondition,
  type SignatureDefinition
} from "../schemas/signature.schema.js";
import { AppError } from "../utils/app-error.js";

const artifactName = "RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf";
const reloadRequestName = "waf-reload-request.json";
const reloadStatusName = "waf-reload-status.json";

async function writeJsonAtomically(path: string, value: unknown) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "w" });
  await rename(temporary, path);
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function numericRuleId(externalId: string, version: number): number {
  let hash = 0;
  for (const character of `${externalId}:${version}`)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 8_000_000 + (hash % 900_000);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectLeaves(condition: MatchCondition): MatchLeafCondition[] {
  return "operator" in condition ? condition.conditions.flatMap(collectLeaves) : [condition];
}

function patternFor(definition: SignatureDefinition): string {
  const leaves = collectLeaves(definition.match);
  if (definition.category === "SQL_INJECTION") {
    const sequences = leaves
      .filter(
        (leaf): leaf is Extract<MatchLeafCondition, { type: "keyword_sequence" }> =>
          leaf.type === "keyword_sequence"
      )
      .map((leaf) => leaf.values.map(escapeRegex).join("[\\s\\S]{0,96}?"));
    return `(?i:(?=[\\s\\S]*['"=()])(?:${sequences.join("|")}))`;
  }
  if (definition.category === "XSS") {
    const html = leaves.find(
      (leaf): leaf is Extract<MatchLeafCondition, { type: "html_tag_with_event_handler" }> =>
        leaf.type === "html_tag_with_event_handler"
    );
    const schemes = leaves
      .filter(
        (leaf): leaf is Extract<MatchLeafCondition, { type: "javascript_scheme" }> =>
          leaf.type === "javascript_scheme"
      )
      .flatMap((leaf) => leaf.values)
      .map(escapeRegex);
    const htmlPattern = html
      ? `<\\s*(?:${html.tags.map(escapeRegex).join("|")})\\b[^>]{0,512}(?:${html.attributes
          .map(escapeRegex)
          .join("|")})\\s*=`
      : "(?!)";
    return `(?i:(?:${htmlPattern}|${schemes.join("|") || "(?!)"}))`;
  }
  return "(?i:(?:\\.\\.[\\\\/]|%2e%2e(?:%2f|%5c)))";
}

function variablesFor(definition: SignatureDefinition): string {
  const variables = definition.target.flatMap((target) => {
    if (target === "query") return ["ARGS_GET"];
    if (target === "body") return ["ARGS_POST", "REQUEST_BODY"];
    if (target === "path") return ["REQUEST_URI"];
    return ["REQUEST_HEADERS"];
  });
  return Array.from(new Set(variables)).join("|");
}

export function exportModSecurityRule(
  definition: SignatureDefinition,
  mode: "shadow" | "active"
): string {
  const id = numericRuleId(definition.id, definition.version);
  const action = mode === "active" ? "deny,status:403" : "pass";
  return `SecRule ${variablesFor(definition)} "@rx ${patternFor(definition)}" "id:${id},phase:2,${action},log,t:none,msg:'${definition.id} ${definition.category}',tag:'siheung-signature'"`;
}

export async function rebuildModSecurityArtifact(): Promise<string> {
  const rules = await prisma.signatureRule.findMany({
    where: {
      status: {
        in: [
          RuleStatus.SHADOW_MODE,
          RuleStatus.APPROVAL_REQUIRED,
          RuleStatus.APPROVED,
          RuleStatus.ACTIVE
        ]
      }
    },
    include: { versions: true },
    orderBy: { externalId: "asc" }
  });

  const exported = rules.flatMap((rule) => {
    const version = rule.versions.find((item) => item.version === rule.currentVersion);
    if (!version) return [];
    const definition = signatureDefinitionSchema.safeParse(version.definition);
    if (!definition.success) {
      throw new AppError(
        `룰 ${rule.externalId} 정의가 유효하지 않습니다.`,
        409,
        "INVALID_RULE_DEFINITION"
      );
    }
    return [
      exportModSecurityRule(
        definition.data,
        rule.status === RuleStatus.ACTIVE ? "active" : "shadow"
      )
    ];
  });
  const exportedIds = exported
    .map((line) => line.match(/\bid:(\d+)/)?.[1])
    .filter((id): id is string => Boolean(id));
  if (new Set(exportedIds).size !== exportedIds.length) {
    throw new AppError("ModSecurity 룰 ID가 중복되었습니다.", 409, "WAF_RULE_ID_CONFLICT");
  }

  const directory = resolve(env.wafRuleDir);
  const target = resolve(directory, artifactName);
  const temporary = resolve(directory, `${artifactName}.tmp`);
  await mkdir(directory, { recursive: true });
  const contents = [
    "# Generated by the Siheung adversarial signature platform.",
    "# Do not edit manually; deploy through the backend API.",
    ...exported,
    ""
  ].join("\n");
  if (!contents.split("\n").every((line) => !line.startsWith("SecRule") || /id:\d+/.test(line))) {
    throw new AppError("ModSecurity 룰 문법 사전 검증에 실패했습니다.", 409, "WAF_EXPORT_INVALID");
  }
  await writeFile(temporary, contents, { encoding: "utf8", flag: "w" });
  await rename(temporary, target);
  const revision = createHash("sha256").update(contents).digest("hex");
  await writeJsonAtomically(resolve(directory, reloadRequestName), {
    revision,
    requestedAt: new Date().toISOString()
  });
  return target;
}

export async function waitForModSecurityReload(): Promise<void> {
  const directory = resolve(env.wafRuleDir);
  const request = await readJson(resolve(directory, reloadRequestName));
  const revision = request?.revision;
  if (typeof revision !== "string") {
    throw new AppError("WAF reload 요청을 찾을 수 없습니다.", 502, "WAF_RELOAD_REQUEST_MISSING");
  }

  const deadline = Date.now() + env.wafReloadTimeoutMs;
  while (Date.now() < deadline) {
    const status = await readJson(resolve(directory, reloadStatusName));
    if (status?.revision === revision) {
      if (status.status === "reloaded") return;
      throw new AppError(
        typeof status.message === "string" ? status.message : "WAF 설정 검증에 실패했습니다.",
        502,
        "WAF_RELOAD_FAILED"
      );
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new AppError("WAF reload 확인 시간이 초과되었습니다.", 504, "WAF_RELOAD_TIMEOUT");
}
