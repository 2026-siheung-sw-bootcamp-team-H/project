export type AttackCategory = "SQL_INJECTION" | "XSS" | "PATH_TRAVERSAL";

export type TrafficClassification = "normal" | "suspicious" | "attack" | "unknown";

export type EnforcementAction = "allowed" | "blocked" | "monitored";

export type RuleStatus =
  | "draft"
  | "sandbox_tested"
  | "holdout_passed"
  | "shadow_mode"
  | "approval_required"
  | "approved"
  | "rejected"
  | "active"
  | "review_required"
  | "failed"
  | "rolled_back"
  | "disabled";

export type ValidationStatus = "queued" | "running" | "hardening" | "passed" | "failed";

export type ServiceStatus = "pending" | "connected" | "disconnected" | "unhealthy" | "disabled";

export type SecurityScanStatus =
  | "queued"
  | "spidering"
  | "active_scanning"
  | "collecting_results"
  | "completed"
  | "failed";

export type SecurityScanStage =
  | "initial_scan"
  | "before_deployment"
  | "shadow_verification"
  | "after_deployment"
  | "ad_hoc";

export type ProtectedService = {
  id: string;
  slug: string;
  name: string;
  connection: string;
  status: ServiceStatus;
  apiUrl: string;
  publicDomain: string;
  originUrl: string;
  proxyUrl: string | null;
  lastRequestAt: string;
  activeRuleCount: number;
  scanCount: number;
};

export type RequestLog = {
  id: string;
  occurredAt: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  ip: string;
  userAgent: string;
  classification: TrafficClassification;
  action: EnforcementAction;
  attackCategory: AttackCategory | null;
  rawRequest: string;
  normalizedRequest: string;
  tokens: string[];
  statusCode: number;
  detectionReasons: string[];
  enforcementSource: string;
  source: "real" | "simulation" | "telemetry";
  simulationId: string | null;
};

export type SecurityScan = {
  id: string;
  protectedServiceId: string;
  ruleId: string | null;
  deploymentId: string | null;
  stage: SecurityScanStage;
  status: SecurityScanStatus;
  progress: number;
  alertCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  informationalCount: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type MatchLeaf = {
  type: string;
  values?: string[];
  threshold?: number;
};

export type MatchCondition = {
  operator: "all" | "any";
  conditions: Array<MatchLeaf | MatchCondition>;
};

export type SignatureDefinition = {
  id: string;
  version: number;
  category: AttackCategory;
  target: string[];
  normalizers: string[];
  match: MatchCondition;
  action: "block" | "monitor";
};

export type SignatureRule = {
  id: string;
  protectedServiceId: string;
  externalId: string;
  sourceLogId: string;
  version: number;
  category: AttackCategory;
  status: RuleStatus;
  confidence: number;
  falsePositiveRate: number;
  createdAt: string;
  deploymentTarget: string;
  summary: string;
  definition: SignatureDefinition;
  versionHistory: Array<{ version: number; note: string; createdAt: string }>;
  validationRunId?: string;
  reportId?: string;
};

export type ValidationRound = {
  round: number;
  strategy: string;
  detectionRate: number;
  falsePositiveRate: number;
  bypassSuccessRate: number;
  ruleChange: string;
};

export type ValidationSample = {
  id: string;
  kind: "attack" | "normal" | "bypass";
  input: string;
  detected: boolean;
  expected: boolean;
};

export type ValidationRun = {
  id: string;
  ruleId: string;
  status: ValidationStatus;
  attackDetectionRate: number;
  falsePositiveRate: number;
  bypassSuccessRate: number;
  confidence: number;
  rounds: ValidationRound[];
  samples: ValidationSample[];
  completedAt: string;
  holdout: {
    sampleCount: number;
    attackDetectionRate: number;
    falsePositiveRate: number;
    confidence: number;
    passed: boolean;
  } | null;
};

export type Deployment = {
  id: string;
  ruleId: string;
  ruleExternalId: string;
  target: "Internal Signature Policy" | "Nginx / ModSecurity" | "Cloudflare Custom Rule";
  status: "ready" | "shadow" | "deployed" | "exported" | "failed" | "rolled_back";
  deployedAt?: string;
  securityScan?: SecurityScan | null;
};

export type AiReport = {
  id: string;
  ruleId: string;
  attackSummary: string;
  detectionEvidence: string[];
  normalizationComparison: { before: string; after: string };
  bypassResult: string;
  confidenceReason: string;
  operatorGuide: string[];
  deploymentRecommendation: string;
  provider: string;
};

export type AiRuntimeStatus = {
  enabled: boolean;
  configured: boolean;
  provider: "none" | "openai" | "gemini";
  model: string | null;
  adversarialMaxRounds: number;
  maxOutputTokens: number;
  callsToday: number;
  dailyCallLimit: number;
  remainingCalls: number;
};

export type PlatformSystemStatus = {
  checkedAt: string;
  backend: { available: boolean; detail: string };
  zap: { available: boolean; detail: string };
  search: { available: boolean; detail: string };
  ai: { available: boolean; detail: string; configured: boolean };
};

export type AuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
};

export type ShadowMetrics = {
  observedRequests: number;
  matchedRequests: number;
  attackMatches: number;
  normalHits: number;
  estimatedFalsePositiveRate: number;
  activeRecommended: boolean;
};

export type RuleArtifact = {
  modSecurityRule: string;
  mode: string;
  artifactPath: string | null;
  version: number;
};

export type SecurityScanComparison = {
  ruleId: string;
  before: SecurityScan;
  after: SecurityScan;
  summary: {
    alertDelta: number;
    highDelta: number;
    mediumDelta: number;
    reductionRate: number;
    resolvedCount: number;
    remainingCount: number;
    introducedCount: number;
  };
};

export type DashboardNextAction =
  | "REGISTER_SERVICE"
  | "TEST_CONNECTION"
  | "RUN_INITIAL_SCAN"
  | "REVIEW_ATTACK_EVENTS"
  | "VALIDATE_RULE"
  | "REVIEW_AI_REPORT"
  | "REVIEW_SHADOW"
  | "APPROVE_RULE"
  | "DEPLOY_ACTIVE"
  | "VIEW_PROTECTION_RESULT"
  | "REVIEW_RULE";
