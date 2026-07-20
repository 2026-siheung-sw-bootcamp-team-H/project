import type {
  AiReport,
  Deployment,
  ProtectedService,
  RequestLog,
  SignatureRule,
  ValidationRun
} from "@/types/domain";

export const protectedService: ProtectedService = {
  id: "svc-demo-shop",
  name: "Demo Shop API",
  connection: "Nginx + ModSecurity",
  status: "connected",
  apiUrl: "http://localhost:4000/demo-shop",
  lastRequestAt: "2026-07-20T10:42:31+09:00",
  activeRuleCount: 12
};

export const requestLogs: RequestLog[] = [
  {
    id: "log-1048",
    occurredAt: "2026-07-20T10:42:31+09:00",
    method: "GET",
    path: "/products?id=1%27%20UNION/**/SELECT%20password%20FROM%20users--",
    ip: "203.0.113.42",
    userAgent: "curl/8.7.1",
    classification: "attack",
    action: "allowed",
    attackCategory: "SQL_INJECTION",
    rawRequest:
      "GET /products?id=1%27%20UNION/**/SELECT%20password%20FROM%20users-- HTTP/1.1\nHost: demo-shop.local\nUser-Agent: curl/8.7.1",
    normalizedRequest: "get /products id 1 union select password from users",
    tokens: ["products", "union", "select", "password", "users"],
    statusCode: 200
  },
  {
    id: "log-1047",
    occurredAt: "2026-07-20T10:39:12+09:00",
    method: "POST",
    path: "/reviews",
    ip: "198.51.100.17",
    userAgent: "Mozilla/5.0",
    classification: "attack",
    action: "blocked",
    attackCategory: "XSS",
    rawRequest:
      'POST /reviews HTTP/1.1\nContent-Type: application/json\n\n{"content":"<img src=x onerror=alert(1)>"}',
    normalizedRequest: "post /reviews content img src x onerror alert 1",
    tokens: ["reviews", "img", "onerror", "alert"],
    statusCode: 403
  },
  {
    id: "log-1046",
    occurredAt: "2026-07-20T10:35:48+09:00",
    method: "GET",
    path: "/files?name=../../etc/passwd",
    ip: "192.0.2.91",
    userAgent: "python-requests/2.32",
    classification: "suspicious",
    action: "allowed",
    attackCategory: "PATH_TRAVERSAL",
    rawRequest: "GET /files?name=../../etc/passwd HTTP/1.1\nHost: demo-shop.local",
    normalizedRequest: "get /files name ../../etc/passwd",
    tokens: ["files", "../", "etc", "passwd"],
    statusCode: 404
  },
  {
    id: "log-1045",
    occurredAt: "2026-07-20T10:30:09+09:00",
    method: "GET",
    path: "/products?id=42",
    ip: "192.0.2.14",
    userAgent: "Mozilla/5.0",
    classification: "normal",
    action: "allowed",
    attackCategory: null,
    rawRequest: "GET /products?id=42 HTTP/1.1\nHost: demo-shop.local\nUser-Agent: Mozilla/5.0",
    normalizedRequest: "get /products id 42",
    tokens: ["products", "id", "42"],
    statusCode: 200
  },
  {
    id: "log-1044",
    occurredAt: "2026-07-20T10:26:43+09:00",
    method: "GET",
    path: "/search?q=wireless+keyboard",
    ip: "192.0.2.29",
    userAgent: "Mozilla/5.0",
    classification: "normal",
    action: "allowed",
    attackCategory: null,
    rawRequest: "GET /search?q=wireless+keyboard HTTP/1.1\nHost: demo-shop.local",
    normalizedRequest: "get /search q wireless keyboard",
    tokens: ["search", "wireless", "keyboard"],
    statusCode: 200
  }
];

const sqlDefinition = {
  id: "SIG-SQLI-014",
  version: 3,
  category: "SQL_INJECTION" as const,
  target: ["query", "body"],
  normalizers: ["url_decode", "unicode_normalize", "lowercase", "strip_sql_comments"],
  match: {
    operator: "all" as const,
    conditions: [
      { type: "keyword_sequence", values: ["union", "select"] },
      { type: "special_character_density", threshold: 0.15 }
    ]
  },
  action: "block" as const
};

export const signatureRules: SignatureRule[] = [
  {
    id: "SIG-SQLI-014",
    sourceLogId: "log-1048",
    version: 3,
    category: "SQL_INJECTION",
    status: "review_required",
    confidence: 0.9408,
    falsePositiveRate: 0.02,
    createdAt: "2026-07-20T09:12:00+09:00",
    deploymentTarget: "Nginx / ModSecurity",
    summary:
      "URL 디코딩과 SQL 주석 제거 후 union-select 키워드 시퀀스를 탐지합니다. 특수문자 밀도를 함께 검사해 일반 검색 문장의 오탐을 줄였습니다.",
    definition: sqlDefinition,
    versionHistory: [
      { version: 1, note: "초기 키워드 시퀀스 생성", createdAt: "2026-07-20T08:45:00+09:00" },
      { version: 2, note: "SQL 주석 우회 정규화 추가", createdAt: "2026-07-20T08:54:00+09:00" },
      { version: 3, note: "특수문자 밀도 조건 추가", createdAt: "2026-07-20T09:12:00+09:00" }
    ],
    validationRunId: "val-301",
    reportId: "report-301"
  },
  {
    id: "SIG-XSS-009",
    sourceLogId: "log-1047",
    version: 2,
    category: "XSS",
    status: "active",
    confidence: 0.9702,
    falsePositiveRate: 0.01,
    createdAt: "2026-07-19T16:20:00+09:00",
    deploymentTarget: "Internal Signature Policy",
    summary: "이벤트 핸들러가 포함된 위험 HTML 태그와 javascript 스킴을 탐지합니다.",
    definition: {
      id: "SIG-XSS-009",
      version: 2,
      category: "XSS",
      target: ["query", "body"],
      normalizers: ["url_decode", "html_entity_decode", "unicode_normalize", "lowercase"],
      match: {
        operator: "any",
        conditions: [
          { type: "html_tag_with_event_handler", values: ["script", "img", "svg"] },
          { type: "javascript_scheme", values: ["javascript:"] }
        ]
      },
      action: "block"
    },
    versionHistory: [
      { version: 1, note: "위험 태그 조건 생성", createdAt: "2026-07-19T15:44:00+09:00" },
      { version: 2, note: "HTML entity 우회 대응", createdAt: "2026-07-19T16:20:00+09:00" }
    ],
    validationRunId: "val-299",
    reportId: "report-299"
  },
  {
    id: "SIG-PATH-004",
    sourceLogId: "log-1046",
    version: 1,
    category: "PATH_TRAVERSAL",
    status: "testing",
    confidence: 0.81,
    falsePositiveRate: 0.04,
    createdAt: "2026-07-20T10:38:00+09:00",
    deploymentTarget: "Internal Signature Policy",
    summary: "중첩된 디렉터리 이동 토큰과 민감 경로 조합을 탐지하는 초기 룰입니다.",
    definition: {
      id: "SIG-PATH-004",
      version: 1,
      category: "PATH_TRAVERSAL",
      target: ["query", "path"],
      normalizers: ["url_decode", "double_decode_check", "unicode_normalize"],
      match: {
        operator: "all",
        conditions: [
          { type: "path_traversal_pattern", values: ["../", "..\\"] },
          { type: "sensitive_path", values: ["/etc/passwd", "win.ini"] }
        ]
      },
      action: "monitor"
    },
    versionHistory: [
      { version: 1, note: "경로 이동 패턴 초기 룰", createdAt: "2026-07-20T10:38:00+09:00" }
    ]
  }
];

export const validationRuns: ValidationRun[] = [
  {
    id: "val-301",
    ruleId: "SIG-SQLI-014",
    status: "passed",
    attackDetectionRate: 0.96,
    falsePositiveRate: 0.02,
    bypassSuccessRate: 0.04,
    confidence: 0.9408,
    completedAt: "2026-07-20T09:14:00+09:00",
    rounds: [
      {
        round: 1,
        strategy: "기본 변형",
        detectionRate: 0.78,
        falsePositiveRate: 0.01,
        bypassSuccessRate: 0.22,
        ruleChange: "union-select 키워드 시퀀스 생성"
      },
      {
        round: 2,
        strategy: "주석·공백 삽입",
        detectionRate: 0.89,
        falsePositiveRate: 0.015,
        bypassSuccessRate: 0.11,
        ruleChange: "SQL 주석 제거 정규화 추가"
      },
      {
        round: 3,
        strategy: "인코딩 + 대소문자 조합",
        detectionRate: 0.96,
        falsePositiveRate: 0.02,
        bypassSuccessRate: 0.04,
        ruleChange: "특수문자 밀도 보조 조건 추가"
      }
    ],
    samples: [
      {
        id: "sample-1",
        kind: "attack",
        input: "1' UNION SELECT password FROM users--",
        detected: true,
        expected: true
      },
      {
        id: "sample-2",
        kind: "attack",
        input: "1' UN/**/ION SEL/**/ECT user()",
        detected: true,
        expected: true
      },
      {
        id: "sample-3",
        kind: "normal",
        input: "wireless union select keyboard",
        detected: false,
        expected: false
      },
      {
        id: "sample-4",
        kind: "normal",
        input: "select a delivery option",
        detected: false,
        expected: false
      },
      {
        id: "sample-5",
        kind: "bypass",
        input: "%55%4e%49%4f%4e/**/%53%45%4c%45%43%54",
        detected: true,
        expected: true
      }
    ]
  }
];

export const deployments: Deployment[] = [
  {
    id: "dep-1",
    ruleId: "SIG-XSS-009",
    target: "Internal Signature Policy",
    status: "deployed",
    deployedAt: "2026-07-19T16:32:00+09:00"
  },
  { id: "dep-2", ruleId: "SIG-SQLI-014", target: "Nginx / ModSecurity", status: "ready" },
  { id: "dep-3", ruleId: "SIG-SQLI-014", target: "Cloudflare Custom Rule", status: "ready" }
];

export const aiReports: AiReport[] = [
  {
    id: "report-301",
    ruleId: "SIG-SQLI-014",
    attackSummary: "상품 조회 쿼리 파라미터에 UNION 기반 SQL Injection 구문이 삽입되었습니다.",
    detectionEvidence: [
      "정규화 후 union → select 키워드 순서 확인",
      "SQL 주석 제거 전후 동일 공격 의도 유지",
      "특수문자 밀도 0.18로 임계값 0.15 초과"
    ],
    normalizationComparison: {
      before: "%55%4e%49%4f%4e/**/%53%45%4c%45%43%54",
      after: "union select"
    },
    bypassResult:
      "3개 라운드에서 URL 인코딩, SQL 주석 삽입, 대소문자 혼합을 테스트했고 최종 우회 성공률은 4%입니다.",
    confidenceReason: "탐지율 96% × (1 - 오탐률 2%) = 94.08%",
    operatorGuide: [
      "검증 샘플 중 미탐 2건을 수동 확인하세요.",
      "운영 반영 전 24시간 monitor 모드를 권장합니다.",
      "검색어에 SQL 용어를 사용하는 정상 트래픽을 관찰하세요."
    ],
    deploymentRecommendation:
      "관리자 승인 후 Internal Policy에 먼저 적용하고, 이상이 없으면 ModSecurity 룰로 export하는 것을 권장합니다."
  }
];
