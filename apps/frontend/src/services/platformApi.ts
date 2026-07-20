import {
  aiReports,
  deployments,
  protectedService,
  requestLogs,
  signatureRules,
  validationRuns
} from "@/data/mockData";
import type {
  AiReport,
  Deployment,
  RequestLog,
  SignatureRule,
  ValidationRun
} from "@/types/domain";

const wait = (milliseconds = 180) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function requireItem<T>(item: T | undefined, label: string): T {
  if (!item) {
    throw new Error(`${label}을(를) 찾을 수 없습니다.`);
  }
  return item;
}

export const platformApi = {
  async login(email: string, password: string) {
    await wait();
    if (email !== "admin@sentinel.local" || password !== "demo1234") {
      throw new Error("데모 계정 정보를 확인해 주세요.");
    }
    return { token: "demo-admin-token", name: "보안 관리자", email };
  },

  async getService() {
    await wait();
    return protectedService;
  },

  async getLogs(): Promise<RequestLog[]> {
    await wait();
    return [...requestLogs];
  },

  async getLog(id: string): Promise<RequestLog> {
    await wait();
    return requireItem(
      requestLogs.find((log) => log.id === id),
      "요청 로그"
    );
  },

  async getRules(): Promise<SignatureRule[]> {
    await wait();
    return [...signatureRules];
  },

  async getRule(id: string): Promise<SignatureRule> {
    await wait();
    return requireItem(
      signatureRules.find((rule) => rule.id === id),
      "시그니처 룰"
    );
  },

  async generateRule(logId: string): Promise<SignatureRule> {
    await wait(500);
    const existing = signatureRules.find((rule) => rule.sourceLogId === logId);
    if (existing) return existing;

    const log = requireItem(
      requestLogs.find((item) => item.id === logId),
      "요청 로그"
    );
    if (!log.attackCategory) throw new Error("정상 요청에서는 룰을 생성할 수 없습니다.");

    const id = `SIG-${log.attackCategory === "XSS" ? "XSS" : "PATH"}-${String(signatureRules.length + 10).padStart(3, "0")}`;
    const rule: SignatureRule = {
      id,
      sourceLogId: log.id,
      version: 1,
      category: log.attackCategory,
      status: "draft",
      confidence: 0.72,
      falsePositiveRate: 0,
      createdAt: new Date().toISOString(),
      deploymentTarget: "Internal Signature Policy",
      summary: "정규화된 공격 토큰을 기반으로 생성한 초기 시그니처 초안입니다.",
      definition: {
        id,
        version: 1,
        category: log.attackCategory,
        target: ["query", "body"],
        normalizers: ["url_decode", "unicode_normalize", "lowercase"],
        match: {
          operator: "all",
          conditions: [{ type: "keyword_sequence", values: log.tokens.slice(0, 3) }]
        },
        action: "monitor"
      },
      versionHistory: [
        { version: 1, note: "공격 로그 기반 초기 룰", createdAt: new Date().toISOString() }
      ]
    };
    signatureRules.unshift(rule);
    return rule;
  },

  async validateRule(ruleId: string): Promise<ValidationRun> {
    await wait(700);
    const rule = requireItem(
      signatureRules.find((item) => item.id === ruleId),
      "시그니처 룰"
    );
    const existing = validationRuns.find((run) => run.ruleId === ruleId);
    if (existing) return existing;

    const run: ValidationRun = {
      id: `val-${300 + validationRuns.length + 1}`,
      ruleId,
      status: "passed",
      attackDetectionRate: 0.95,
      falsePositiveRate: 0.02,
      bypassSuccessRate: 0.05,
      confidence: 0.931,
      completedAt: new Date().toISOString(),
      rounds: [
        {
          round: 1,
          strategy: "기본 변형",
          detectionRate: 0.82,
          falsePositiveRate: 0.01,
          bypassSuccessRate: 0.18,
          ruleChange: "초기 조건 트리 생성"
        },
        {
          round: 2,
          strategy: "인코딩·공백 우회",
          detectionRate: 0.95,
          falsePositiveRate: 0.02,
          bypassSuccessRate: 0.05,
          ruleChange: "정규화 단계 보강"
        }
      ],
      samples: [
        {
          id: "generated-1",
          kind: "attack",
          input: "원본 공격 샘플",
          detected: true,
          expected: true
        },
        {
          id: "generated-2",
          kind: "normal",
          input: "정상 요청 리플레이",
          detected: false,
          expected: false
        },
        {
          id: "generated-3",
          kind: "bypass",
          input: "인코딩 우회 샘플",
          detected: true,
          expected: true
        }
      ]
    };
    validationRuns.unshift(run);
    rule.validationRunId = run.id;
    rule.status = "review_required";
    rule.confidence = run.confidence;
    rule.falsePositiveRate = run.falsePositiveRate;
    return run;
  },

  async getValidation(id: string): Promise<ValidationRun> {
    await wait();
    return requireItem(
      validationRuns.find((run) => run.id === id),
      "검증 실행"
    );
  },

  async approveRule(id: string): Promise<SignatureRule> {
    await wait();
    const rule = requireItem(
      signatureRules.find((item) => item.id === id),
      "시그니처 룰"
    );
    rule.status = "passed";
    return rule;
  },

  async activateRule(id: string): Promise<SignatureRule> {
    await wait();
    const rule = requireItem(
      signatureRules.find((item) => item.id === id),
      "시그니처 룰"
    );
    rule.status = rule.status === "active" ? "passed" : "active";
    return rule;
  },

  async getDeployments(): Promise<Deployment[]> {
    await wait();
    return [...deployments];
  },

  async deploy(id: string): Promise<Deployment> {
    await wait(400);
    const deployment = requireItem(
      deployments.find((item) => item.id === id),
      "배포 대상"
    );
    deployment.status = deployment.target === "Cloudflare Custom Rule" ? "exported" : "deployed";
    deployment.deployedAt = new Date().toISOString();
    return deployment;
  },

  async getReport(id: string): Promise<AiReport> {
    await wait();
    return requireItem(
      aiReports.find((report) => report.id === id),
      "AI 리포트"
    );
  },

  async getDashboard() {
    await wait();
    return {
      service: protectedService,
      requestCount: 1284,
      blockedCount: 87,
      activeRuleCount: signatureRules.filter((rule) => rule.status === "active").length + 11,
      averageConfidence: 0.923,
      latestValidation: validationRuns[0],
      hourlyRequests: [
        { time: "06:00", normal: 82, attack: 8, blocked: 5 },
        { time: "07:00", normal: 116, attack: 12, blocked: 9 },
        { time: "08:00", normal: 184, attack: 18, blocked: 14 },
        { time: "09:00", normal: 241, attack: 31, blocked: 26 },
        { time: "10:00", normal: 268, attack: 36, blocked: 33 }
      ]
    };
  }
};
