export type AttackCategory = "SQL_INJECTION" | "XSS" | "PATH_TRAVERSAL";

export type TrafficClassification = "normal" | "suspicious" | "attack" | "unknown";

export type EnforcementAction = "allowed" | "blocked";

export type RuleStatus = "draft" | "testing" | "passed" | "review_required" | "active" | "failed";

export type ValidationStatus = "queued" | "running" | "hardening" | "passed" | "failed";

export type ProtectedService = {
  id: string;
  name: string;
  connection: string;
  status: "connected" | "disconnected";
  apiUrl: string;
  lastRequestAt: string;
  activeRuleCount: number;
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
};

export type MatchCondition = {
  operator: "all" | "any";
  conditions: Array<{
    type: string;
    values?: string[];
    threshold?: number;
  }>;
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
};

export type Deployment = {
  id: string;
  ruleId: string;
  target: "Internal Signature Policy" | "Nginx / ModSecurity" | "Cloudflare Custom Rule";
  status: "ready" | "deployed" | "exported";
  deployedAt?: string;
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
};
