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
      version: "0.2.0",
      description: "반복 우회 검증, 룰 개선, holdout 평가 및 WAF 배포를 제공하는 백엔드 API"
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
      { name: "Request Events" },
      { name: "Signature Rules" },
      { name: "Validation" },
      { name: "Deployment" },
      { name: "Telemetry" }
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
      "/api/protected-services": { get: adminOperation("보호 서비스 목록") },
      "/api/dashboard": { get: adminOperation("대시보드 집계") },
      "/api/request-events": { get: adminOperation("수집 요청 목록") },
      "/api/request-events/{id}": { get: adminOperation("수집 요청 상세", true) },
      "/api/request-events/{id}/normalize": {
        post: adminOperation("저장된 안전한 요청 재정규화", true)
      },
      "/api/signature-rules": { get: adminOperation("시그니처 룰 목록") },
      "/api/signature-rules/generate": {
        post: adminOperation("공격 이벤트에서 초기 룰 생성")
      },
      "/api/signature-rules/{id}": { get: adminOperation("룰 버전·검증·배포 상세", true) },
      "/api/signature-rules/{id}/validate": {
        post: adminOperation("반복 우회·개선·holdout 검증 작업 시작", true)
      },
      "/api/signature-rules/{id}/request-approval": {
        post: adminOperation("Shadow 결과에 대한 승인 요청", true)
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
