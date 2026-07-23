import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";

const bearerSecurity = [{ BearerAuth: [] }];
const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" }
};
const standardResponses = {
  200: { description: "요청 성공" },
  400: { description: "잘못된 요청" },
  401: { description: "인증 실패" },
  409: { description: "현재 상태에서 수행할 수 없는 요청" }
};
const adminOperation = (summary: string, withId = false) => ({
  summary,
  security: bearerSecurity,
  ...(withId ? { parameters: [idParameter] } : {}),
  responses: standardResponses
});

const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Adversarial Signature Platform API",
      version: "0.4.0",
      description:
        "GPT 기반 최대 5라운드 우회 개선, AI 리포트, holdout 평가, ZAP 검증 및 WAF 배포 API"
    },
    servers: [
      { url: "http://localhost:8080", description: "Local WAF entrypoint" },
      { url: `http://localhost:${process.env.PORT ?? 4000}`, description: "Direct backend" }
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        TelemetryToken: { type: "apiKey", in: "header", name: "x-telemetry-token" }
      },
      schemas: {
        AdminLogin: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" }
          }
        },
        RuleDeployment: {
          type: "object",
          required: ["mode"],
          properties: {
            mode: { enum: ["shadow", "active", "rollback"] },
            targetType: { enum: ["INTERNAL", "MODSECURITY", "CLOUDFLARE"] }
          }
        }
      }
    },
    tags: [
      { name: "Auth" },
      { name: "Demo Shop" },
      { name: "Protected Services" },
      { name: "Request Events" },
      { name: "Signature Rules" },
      { name: "Validation" },
      { name: "Deployment" },
      { name: "Telemetry" },
      { name: "Search" },
      { name: "Security Scan" },
      { name: "AI" }
    ],
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "고정 관리자 로그인",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AdminLogin" } } }
          },
          responses: { 200: { description: "JWT 발급" }, 401: { description: "로그인 실패" } }
        }
      },
      "/demo-shop/products": {
        get: {
          tags: ["Demo Shop"],
          summary: "상품 조회 및 요청 수집",
          responses: standardResponses
        }
      },
      "/demo-shop/search": {
        get: {
          tags: ["Demo Shop"],
          summary: "상품 검색 및 요청 수집",
          responses: standardResponses
        }
      },
      "/demo-shop/reviews": {
        post: { tags: ["Demo Shop"], summary: "안전한 리뷰 mock", responses: standardResponses }
      },
      "/demo-shop/login": {
        post: { tags: ["Demo Shop"], summary: "안전한 로그인 mock", responses: standardResponses }
      },
      "/api/protected-services": {
        get: { ...adminOperation("보호 서비스 목록"), tags: ["Protected Services"] },
        post: { ...adminOperation("보호 서비스 등록"), tags: ["Protected Services"] }
      },
      "/api/protected-services/{id}": {
        get: { ...adminOperation("보호 서비스 상세", true), tags: ["Protected Services"] },
        patch: {
          ...adminOperation("보호 서비스 수정·비활성화", true),
          tags: ["Protected Services"]
        }
      },
      "/api/protected-services/{id}/connection-test": {
        post: {
          ...adminOperation("SSRF 방어가 적용된 연결 테스트", true),
          tags: ["Protected Services"]
        }
      },
      "/api/protected-services/{id}/initial-scan": {
        post: { ...adminOperation("서비스 최초 ZAP 보안 진단 시작", true), tags: ["Security Scan"] }
      },
      "/api/dashboard": { get: adminOperation("대시보드 집계") },
      "/api/ai/status": {
        get: { ...adminOperation("AI 공급자·비용 상한·호출 현황"), tags: ["AI"] }
      },
      "/api/request-events": { get: adminOperation("수집 요청 목록") },
      "/api/request-events/{id}": { get: adminOperation("수집 요청 상세", true) },
      "/api/request-events/{id}/normalize": {
        post: adminOperation("저장된 안전한 요청 재정규화", true)
      },
      "/api/signature-rules": { get: adminOperation("시그니처 룰 목록") },
      "/api/request-events/search": {
        get: { ...adminOperation("OpenSearch 공격 로그 검색 및 집계"), tags: ["Search"] }
      },
      "/api/request-events/search/health": {
        get: { ...adminOperation("OpenSearch 연결 및 fallback 상태"), tags: ["Search"] }
      },
      "/api/signature-rules/generate": {
        post: adminOperation("공격 이벤트에서 초기 룰 생성")
      },
      "/api/signature-rules/{id}": { get: adminOperation("룰 버전·검증·배포 상세", true) },
      "/api/signature-rules/{id}/artifact": {
        get: adminOperation("현재 ModSecurity SecRule 미리보기", true)
      },
      "/api/signature-rules/{id}/shadow-metrics": {
        get: adminOperation("Shadow 관찰·오탐 지표", true)
      },
      "/api/signature-rules/{id}/validate": {
        post: adminOperation("최대 5라운드 우회 개선·holdout·AI 리포트·배포 전 ZAP 작업 시작", true)
      },
      "/api/signature-rules/{id}/request-approval": {
        post: adminOperation("Shadow 관찰 결과에 대한 Active 전환 승인 요청", true)
      },
      "/api/signature-rules/{id}/approve": {
        post: adminOperation("관리자 룰 승인", true)
      },
      "/api/signature-rules/{id}/reject": {
        post: adminOperation("관리자 룰 반려", true)
      },
      "/api/signature-rules/{id}/deploy": {
        post: {
          ...adminOperation("Shadow·active 배포 또는 rollback", true),
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/RuleDeployment" } }
            }
          }
        }
      },
      "/api/validation-runs/{id}": { get: adminOperation("검증 라운드 및 holdout 결과", true) },
      "/api/jobs/{id}": { get: adminOperation("BullMQ 작업 상태", true) },
      "/api/deployments": { get: adminOperation("배포 및 rollback 이력") },
      "/api/audit-logs": { get: adminOperation("관리자 작업 감사 로그") },
      "/api/reports/generate": { post: adminOperation("AI 또는 결정론적 보안 리포트 생성") },
      "/api/telemetry/request-events": {
        post: {
          tags: ["Telemetry"],
          summary: "외부 요청 이벤트 수집",
          security: [{ TelemetryToken: [] }],
          responses: standardResponses
        }
      },
      "/api/telemetry/security-events": {
        post: {
          tags: ["Telemetry"],
          summary: "멱등 보안 이벤트 수집",
          security: [{ TelemetryToken: [] }],
          responses: standardResponses
        }
      },
      "/api/security-scans": {
        get: { ...adminOperation("ZAP 스캔 이력 조회"), tags: ["Security Scan"] },
        post: { ...adminOperation("ZAP 자동 Active Scan 시작"), tags: ["Security Scan"] }
      },
      "/api/security-scans/{id}": {
        get: { ...adminOperation("ZAP 스캔 결과 조회", true), tags: ["Security Scan"] }
      },
      "/api/security-scans/{id}/events": {
        get: { ...adminOperation("ZAP 진행률 SSE", true), tags: ["Security Scan"] }
      },
      "/api/security-scans/compare": {
        get: { ...adminOperation("배포 전·후 ZAP 결과 비교"), tags: ["Security Scan"] }
      },
      "/api/security-scans/health": {
        get: { ...adminOperation("ZAP daemon 연결 상태"), tags: ["Security Scan"] }
      },
      "/api/telemetry/otlp/v1/logs": {
        post: {
          tags: ["Telemetry"],
          summary: "OpenTelemetry WAF 로그 수집",
          security: [{ TelemetryToken: [] }],
          responses: standardResponses
        }
      }
    }
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"]
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
