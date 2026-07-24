import { z } from "zod";

const developmentSecret = "development-only-secret-change-before-production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
    DATABASE_URL: z
      .string()
      .default("postgresql://siheung:siheung_dev@localhost:5432/siheung?schema=public"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    QUEUE_ENABLED: z.stringbool().default(false),
    OPENSEARCH_ENABLED: z.stringbool().default(false),
    OPENSEARCH_URL: z.url().default("http://localhost:9200"),
    OPENSEARCH_INDEX: z
      .string()
      .regex(/^[a-z0-9][a-z0-9_-]*$/)
      .default("request-events-v1"),
    OPENSEARCH_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(5000),
    SEARCH_OUTBOX_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
    ZAP_ENABLED: z.stringbool().default(false),
    ZAP_API_URL: z.url().default("http://localhost:8090"),
    ZAP_API_KEY: z.string().min(16).default("local-zap-api-key-change-this"),
    ZAP_TARGET_URL: z.url().default("http://waf:8080/demo-shop"),
    DEMO_SHOP_PUBLIC_URL: z.url().default("http://localhost:8081/demo-shop"),
    DEMO_SHOP_ORIGIN_URL: z.url().default("http://backend:4000/demo-shop"),
    DEMO_SHOP_WAF_URL: z.url().default("http://waf:8080/demo-shop"),
    ZAP_SCAN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(30_000)
      .max(30 * 60_000)
      .default(10 * 60_000),
    SERVICE_CONNECTION_ALLOW_PRIVATE: z.stringbool().default(false),
    SERVICE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(500).max(15_000).default(5000),
    SERVICE_CONNECTION_MAX_BYTES: z.coerce.number().int().min(1024).max(1_048_576).default(65_536),
    JWT_SECRET: z.string().min(32).default(developmentSecret),
    JWT_EXPIRES_IN: z.string().default("30m"),
    ADMIN_EMAIL: z.email().default("admin@sentinel.local"),
    ADMIN_PASSWORD: z.string().min(8).default("demo1234"),
    ADMIN_NAME: z.string().default("보안 관리자"),
    HMAC_SECRET: z.string().min(32).default(`${developmentSecret}-hmac`),
    TELEMETRY_TOKEN: z.string().min(16).default(`${developmentSecret}-telemetry`),
    SAFE_REPLAY_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
    MAX_CAPTURE_BODY_BYTES: z.coerce.number().int().positive().max(1_048_576).default(32_768),
    AI_PROVIDER: z.enum(["none", "openai", "gemini"]).default("none"),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().min(1).optional(),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(20_000),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(8192).default(1200),
    AI_DAILY_CALL_LIMIT: z.coerce.number().int().min(1).max(10_000).default(50),
    ADVERSARIAL_MAX_ROUNDS: z.coerce.number().int().min(1).max(5).default(5),
    CLEANUP_INTERVAL_MS: z.coerce.number().int().min(60_000).default(3_600_000),
    WAF_RULE_DIR: z.string().default("./var/waf-rules"),
    WAF_RELOAD_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(15_000)
  })
  .superRefine((value, context) => {
    if (value.AI_PROVIDER === "openai" && !value.OPENAI_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required"
      });
    }
    if (value.AI_PROVIDER === "gemini" && !value.GEMINI_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message: "GEMINI_API_KEY is required"
      });
    }
  });

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === "production" && parsed.JWT_SECRET === developmentSecret) {
  throw new Error("JWT_SECRET must be changed in production.");
}

export const env = {
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  clientOrigin: parsed.CLIENT_ORIGIN,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  queueEnabled: parsed.QUEUE_ENABLED,
  openSearchEnabled: parsed.OPENSEARCH_ENABLED,
  openSearchUrl: parsed.OPENSEARCH_URL,
  openSearchIndex: parsed.OPENSEARCH_INDEX,
  openSearchTimeoutMs: parsed.OPENSEARCH_TIMEOUT_MS,
  searchOutboxIntervalMs: parsed.SEARCH_OUTBOX_INTERVAL_MS,
  zapEnabled: parsed.ZAP_ENABLED,
  zapApiUrl: parsed.ZAP_API_URL,
  zapApiKey: parsed.ZAP_API_KEY,
  zapTargetUrl: parsed.ZAP_TARGET_URL,
  demoShopPublicUrl: parsed.DEMO_SHOP_PUBLIC_URL,
  demoShopOriginUrl: parsed.DEMO_SHOP_ORIGIN_URL,
  demoShopWafUrl: parsed.DEMO_SHOP_WAF_URL,
  zapScanTimeoutMs: parsed.ZAP_SCAN_TIMEOUT_MS,
  serviceConnectionAllowPrivate: parsed.SERVICE_CONNECTION_ALLOW_PRIVATE,
  serviceConnectionTimeoutMs: parsed.SERVICE_CONNECTION_TIMEOUT_MS,
  serviceConnectionMaxBytes: parsed.SERVICE_CONNECTION_MAX_BYTES,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  adminEmail: parsed.ADMIN_EMAIL,
  adminPassword: parsed.ADMIN_PASSWORD,
  adminName: parsed.ADMIN_NAME,
  hmacSecret: parsed.HMAC_SECRET,
  telemetryToken: parsed.TELEMETRY_TOKEN,
  safeReplayRetentionHours: parsed.SAFE_REPLAY_RETENTION_HOURS,
  maxCaptureBodyBytes: parsed.MAX_CAPTURE_BODY_BYTES,
  aiProvider: parsed.AI_PROVIDER,
  openAiApiKey: parsed.OPENAI_API_KEY,
  geminiApiKey: parsed.GEMINI_API_KEY,
  aiModel: parsed.AI_MODEL,
  aiTimeoutMs: parsed.AI_TIMEOUT_MS,
  aiMaxOutputTokens: parsed.AI_MAX_OUTPUT_TOKENS,
  aiDailyCallLimit: parsed.AI_DAILY_CALL_LIMIT,
  adversarialMaxRounds: parsed.ADVERSARIAL_MAX_ROUNDS,
  cleanupIntervalMs: parsed.CLEANUP_INTERVAL_MS,
  wafRuleDir: parsed.WAF_RULE_DIR,
  wafReloadTimeoutMs: parsed.WAF_RELOAD_TIMEOUT_MS
} as const;
