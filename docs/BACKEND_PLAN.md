# Backend Implementation Plan

## 1. 목표와 현재 판단

이 백엔드는 **보호 서비스의 요청 수집 → 정규화/탐지 → 시그니처 생성 → 반복 우회 검증 → Holdout 최종 검증 → AI 리포트 → 관리자 검토 → Shadow 배포/관찰 → 최종 승인 → Active WAF 배포** 흐름을 제공한다.

현재는 보호 서비스 CRUD와 안전한 연결 테스트, 핵심 보안 파이프라인, OpenAI Responses API, OpenSearch, 초기/Shadow/배포 후 자동 ZAP 검증과 Docker 인프라가 연결된 단계다.

따라서 완료 기준을 다음 두 단계로 나눈다.

- **현재 코어 단계**: 최대 5라운드 AI 보안 파이프라인, 구조화 리포트, WAF/ZAP 전후 검증 흐름이 동작한다.
- **프로젝트 최종 완성 기준**: P0 기능 API와 P1 OpenSearch/ZAP SSE를 구현한 현재 범위를 발표·포트폴리오용 최종 백엔드로 본다.
- **실서비스 운영 기준**: P2의 고가용성, 백업, TLS, 모니터링, 장애 복구까지 충족한 상태다.

즉, 최소 기능만 만든 상태를 최종 목표로 삼지 않는다. 현재 프로젝트는 **단일 노드에서도 운영 흐름을 증명할 수 있는 완성형 보안 플랫폼**을 목표로 하고, 실제 기업 운영에 필요한 다중 노드/재해 복구는 별도 단계로 구분한다.

### 1.1 기준 처리 흐름

```text
요청/공격 로그 수집
→ Normalizer 정규화
→ Signature Detector 분석
→ Rule Generator 초안 생성
→ Sandbox 반복 우회/정상 요청 검증
→ Holdout 최종 검증
→ AI Report 생성
→ 관리자가 AI 리포트와 검증 지표 확인
→ 관리자가 Shadow 배포 실행
→ Shadow 매칭/오탐 관찰
→ Active 전환 승인 또는 반려
→ ModSecurity 룰 export
→ nginx -t 및 reload ACK
→ Active 차단
→ 문제 발생 시 Rollback
```

AI 리포트는 Sandbox/Holdout 검증 근거를 설명하므로 최초 WAF 배포 전에 생성한다. Shadow 결과는 실제 운영 트래픽 관찰값이므로 별도 배포 지표로 기록하고, 최종 Active 승인 시 AI 리포트·검증 결과·Shadow 관찰 결과를 함께 확인한다.

여기서 승인 단계는 두 의미를 구분한다.

- **Shadow 배포 실행**: 관리자가 리포트를 확인하고 비차단 관찰을 시작하는 명시적 운영 작업
- **Active 최종 승인**: Shadow 결과까지 확인한 후 실제 차단을 허용하는 `RuleApproval`

검증 통과만으로 Shadow나 Active를 자동 배포하지 않는다.

## 2. 확정 기술 스택

- Runtime/API: Node.js, Express, TypeScript
- Validation: Zod
- ORM/Source of Truth: Prisma, PostgreSQL
- Async Job: BullMQ
- Queue Backend: Redis
- Reverse Proxy/WAF: Nginx, ModSecurity, OWASP CRS
- Telemetry: OpenTelemetry Collector
- AI: OpenAI Responses API 또는 Gemini API
- Search: PostgreSQL 원본 저장, OpenSearch 검색 인덱스와 장애 시 PostgreSQL fallback
- Infra: Docker Compose, 이후 AWS EC2 배포

BullMQ와 Redis는 같은 기술이 아니다. BullMQ는 애플리케이션의 작업 큐/워커 라이브러리이고, Redis는 BullMQ 작업 상태와 대기열을 저장하는 인프라다.

```text
Express API → BullMQ Queue → Redis ← BullMQ Worker
                                  ├─ 반복 우회 검증
                                  ├─ AI 리포트 생성
                                  └─ OpenSearch Outbox 색인
```

## 3. 현재 구현 상태

### 3.1 완료된 핵심 기능

- PostgreSQL, Redis, Backend, Worker, Nginx/ModSecurity/CRS, OTel Collector Docker 구성
- 고정 관리자 로그인과 JWT 인증
- Demo Shop 요청 수집
- 민감 헤더/필드 제거, body 크기 제한, HMAC 기반 IP 지문
- 요청 원본 대신 sanitized snapshot과 safe replay payload 저장
- URL/HTML/Unicode/대소문자/주석/공백 정규화
- SQL Injection, XSS, Path Traversal 조건 트리 탐지
- 공격 이벤트 기반 초기 시그니처 생성
- 동일 공격 이벤트의 룰 중복 생성 방지
- generation/validation/holdout 데이터 분리
- 결정론적 우회와 AI 생성 우회 페이로드의 반복 검증
- 개선된 후보만 채택하는 룰 버전 관리
- 탐지율, 오탐률, 우회 성공률, confidence 계산
- Holdout 해시/샘플 수/잠금 시각 무결성 검사
- 룰별 검증 동시 실행 잠금
- BullMQ 작업 중복 등록 방지, 재시도, Worker 분리
- Shadow → 승인 요청 → 승인/반려 → Active → Rollback 상태 흐름
- ModSecurity 룰 export, `nginx -t`, reload ACK 확인, 실패 시 배포 실패/상태 복구
- AI 호출 감사 기록과 AI 리포트 영구 저장
- 표준 오류 코드, request ID, Zod field error 응답
- 만료 replay payload 정리 작업
- 단위 테스트, PostgreSQL/Redis/WAF 통합 테스트, Backend CI

### 3.2 요구사항별 갭 분석

| 요구사항         | 상태 | 현재 구현                                              | 추가 작업                                                  |
| ---------------- | ---- | ------------------------------------------------------ | ---------------------------------------------------------- |
| 보호 서비스 관리 | 완료 | 등록/상세/수정/비활성화, SSRF 방어 연결 테스트         | 프론트 등록 화면 연결                                      |
| 실제 요청 로그   | 부분 | 수집, 상세, classification/category/cursor 조회        | service/action/source/기간 필터와 운영용 페이지 메타데이터 |
| 대시보드         | 부분 | 서비스별 기본 집계와 `nextAction` 권장 작업            | 기간별 시계열과 분류별 상세 수치                           |
| 로그에서 룰 생성 | 완료 | 이벤트 연결, 정상 요청 거부, 멱등성 보장               | 경로 명칭만 현재 API 기준으로 유지                         |
| 비동기 AI 검증   | 부분 | BullMQ/Redis/Worker, 상태 조회, 결과 영구 저장         | 단계별 progress/currentRound 노출                          |
| AI 리포트        | 완료 | 구조화 생성/검증/저장, 룰 상세에서 조회, 비용 상한     | 독립 리포트 화면용 단건 API는 필요 시 추가                 |
| 승인·배포·롤백   | 완료 | 승인/반려/Shadow/Active/Rollback, Shadow 지표, SecRule | 배포 단건 GET은 필요 시 추가                               |
| 실시간 갱신      | 부분 | polling 조회와 ZAP 진행률 SSE                          | 검증 라운드 SSE는 필요 시 추가                             |
| 관리자 인증      | 완료 | 단일 관리자 로그인/JWT                                 | 현행 유지. refresh/logout 구조 변경 없음                   |
| 감사 로그        | 완료 | 서비스/진단/승인/배포 행동 저장과 목록·필터 API        | 프론트 감사 화면 연결                                      |
| 오류 응답        | 완료 | code/message/fieldErrors/requestId                     | 신규 API도 같은 포맷 유지                                  |
| 보존/마스킹      | 완료 | 마스킹, raw 미저장, replay 만료 정리                   | 운영 환경별 보존 기간 문서화                               |
| 여러 서비스      | 부분 | CRUD, 서비스별 조회·ZAP 대상·지원 데이터               | 실제 WAF의 서비스별 동적 upstream 구성                     |
| 테스트 공격 분리 | 완료 | `REAL`/`SIMULATION`/`TELEMETRY`, simulationId 저장     | 프론트 필터와 배지 연결                                    |
| OpenSearch       | 완료 | Outbox/BullMQ 색인, 검색·집계 API, PostgreSQL fallback | 운영 시 인증/TLS/보존 정책 추가                            |

## 4. API 명명 원칙

기존 코드와 프론트 연결을 불필요하게 깨지 않도록 현재 리소스 이름을 유지한다.

- 보호 서비스: `/api/protected-services`
- 요청 로그: `/api/request-events`
- 시그니처 룰: `/api/signature-rules`
- 검증 결과: `/api/validation-runs`
- 작업 상태: `/api/jobs`
- 배포: `/api/deployments`
- 리포트: `/api/reports`

첨부안의 `/api/services`, `/api/requests`, `/api/rules`는 새 중복 API로 만들지 않는다. 필요하면 프론트 API client에서 의미만 매핑한다.

## 5. P0 — 플랫폼 기능 완성

### 5.1 보호 서비스 CRUD와 연결 테스트

#### 데이터 모델 변경

`ProtectedService`에 다음 필드를 추가한다.

- `publicDomain`: 사용자가 접근하는 공개 도메인
- `originUrl`: 프록시가 전달할 원본 서버 주소
- `proxyUrl`: WAF 프록시 접근 주소
- `status`: `PENDING | CONNECTED | UNHEALTHY | DISABLED`
- `connectedAt`
- `lastHealthCheckedAt`
- `lastRequestAt`
- `disabledAt`

기존 `apiUrl`은 migration 동안 `originUrl`로 이전한 뒤 제거하거나 deprecated 처리한다.

#### API

- `GET /api/protected-services`
- `POST /api/protected-services`
- `GET /api/protected-services/:id`
- `PATCH /api/protected-services/:id`
- `POST /api/protected-services/:id/connection-test`

#### 보안 조건

연결 테스트는 서버가 사용자 입력 URL을 호출하므로 SSRF 방어가 필수다.

- `http`/`https`만 허용
- localhost, loopback, link-local, private network 기본 차단
- DNS 재확인 및 redirect 제한
- 짧은 timeout과 응답 크기 제한
- URL에 포함된 credential 거부
- 운영 환경에서 허용된 origin 대역을 명시적으로 관리

로컬 Demo Shop은 개발 환경 allowlist로만 허용한다.

### 5.2 요청 로그 모델과 조회 API 보강

`RequestEvent`에 다음을 추가한다.

- `source`: `REAL | SIMULATION | TELEMETRY`
- `simulationId`: nullable
- 필요하면 `ingestionSource`: `EXPRESS | MODSECURITY | OTEL`

기존 Detection/Enforcement 관계에서 classification, category, action, matched rule을 조합해 응답 DTO를 만든다. 중복 컬럼을 무조건 `RequestEvent`에 복사하지 않는다.

#### 조회 API

- `GET /api/request-events`
- `GET /api/request-events/:id`

#### 필터

- `serviceId`
- `classification`
- `action`
- `category`
- `source`
- `from`, `to`
- `cursor`, `limit`

기존 cursor pagination을 유지한다. 화면에 전체 건수가 반드시 필요하면 별도 count를 포함하되, 대량 로그에서는 매 요청마다 비싼 전체 count를 하지 않도록 한다.

필수 DB 인덱스:

- `(protectedServiceId, occurredAt)`
- `(source, occurredAt)`
- Detection의 `(classification, createdAt)`
- Enforcement의 `(action, createdAt)`

### 5.3 테스트 공격 전용 API

- `POST /api/protected-services/:id/simulations`

요청 예시:

```json
{
  "scenario": "SQL_INJECTION"
}
```

허용된 고정 시나리오만 실행한다. 사용자가 임의 코드, 명령, URL을 입력해 실행하는 기능은 만들지 않는다.

생성된 이벤트에는 `source=SIMULATION`, `simulationId`를 기록한다. 실제 트래픽 통계의 기본값은 simulation을 제외하고, 발표 화면에서 명시적으로 포함할 수 있게 한다.

### 5.4 실제 데이터 기반 대시보드

- `GET /api/dashboard?serviceId=:id&period=24h&includeSimulation=false`

응답에 다음을 포함한다.

- 전체/정상/의심/공격/차단 요청 수
- 활성 룰 수
- 평균 confidence
- 검토 대기 룰 수
- 시간대별 normal/attack/blocked 통계
- 최근 이벤트
- `recommendedAction`

집계 기준 시각과 timezone을 응답에 포함한다. P0는 PostgreSQL `groupBy` 또는 raw SQL로 구현하고, OpenSearch 없이 먼저 정확성을 검증한다.

### 5.5 비동기 검증 진행률

현재 BullMQ job 상태와 DB `ValidationRun`을 연결한다.

- Queue 등록 직후 `ValidationRun=QUEUED` 생성
- Worker 시작 시 `RUNNING` 또는 `GENERATING_BYPASSES`
- 라운드마다 `currentRound`, `progress`, 중간 지표 갱신
- 완료 시 `PASSED | FAILED`
- 실패 시 오류 코드와 안전한 메시지 저장

API:

- `POST /api/signature-rules/:id/validate`
- `GET /api/jobs/:jobId`
- `GET /api/validation-runs/:id`

SSE 연결 전이나 연결이 끊어진 경우에는 2~3초 polling으로 fallback한다. 브라우저가 닫혀도 DB의 ValidationRun으로 상태를 복원할 수 있어야 한다.

### 5.6 AI 리포트 조회 API

- `POST /api/reports/generate`
- `GET /api/reports/:id`
- `GET /api/signature-rules/:ruleId/report`

리포트는 생성 당시의 `ruleVersionId`, `validationRunId`, 검증 지표를 고정해서 저장한다. 이후 룰이 바뀌어도 과거 리포트 근거가 변하면 안 된다.

AI에게는 마스킹된 최소 근거만 전달한다. AI 응답은 설명 자료이며 차단/배포 판정의 source of truth가 아니다.

### 5.7 감사 로그 조회 확대

- `GET /api/audit-logs`

필터:

- `userId`
- `action`
- `resourceType`
- `resourceId`
- `from`, `to`
- `cursor`, `limit`

추가 기록 대상:

- 보호 서비스 등록/수정/비활성화/연결 테스트
- 룰 생성
- 검증 등록/시작/완료/실패
- 승인/반려
- Shadow/Active/Rollback
- 리포트 생성

## 6. P1 — 검색과 운영 가시성

### 6.1 OpenSearch 도입 조건과 역할

OpenSearch는 PostgreSQL을 대체하지 않는다.

- PostgreSQL: 이벤트 관계, 룰, 검증, 승인, 배포의 원본 데이터
- OpenSearch: 대량 로그 전문 검색, 기간 집계, 공격 패턴 분석
- GPT: 두 저장소에서 백엔드가 선별한 근거만 입력받아 리포트 작성

도입 순서:

```text
RequestEvent 트랜잭션 저장
→ Outbox 이벤트 생성
→ BullMQ 색인 작업
→ OpenSearch index/update
→ 성공 시 Outbox 처리 완료
```

DB 저장과 OpenSearch 색인을 API 요청 안에서 동시에 수행하는 단순 dual-write는 금지한다. 검색 장애가 원본 이벤트 수집 장애로 번지지 않게 한다.

초기 인덱스:

- `security-events-v1`
- 월/일 단위 rollover는 실제 로그량을 보고 결정
- raw cookie/token/body 원문 색인 금지
- `serviceId`, `occurredAt`, `classification`, `action`, `category`, `source`, `path`, `matchedRuleIds`, 정규화 토큰만 색인

검색 API:

- `GET /api/security-search`
- 서비스/기간/분류/차단/카테고리 필터
- path, 마스킹 payload, normalized token 전문 검색
- 공격 상위 경로/카테고리/시간대 aggregation

OpenSearch 장애 시 PostgreSQL 기본 조회로 degraded mode를 제공한다.

#### 로컬 실행 시 필요한 인프라 준비

OpenSearch 코드를 추가해도 JVM 기반 검색 엔진을 실행할 호스트 설정은 필요하다.

- Docker Desktop에 최소 4GB 이상 메모리를 할당한다. 이 프로젝트 전체 컨테이너를 함께 실행할 때는 6~8GB를 권장한다.
- Windows Docker Desktop/WSL 환경에서는 `vm.max_map_count=262144`를 설정한다.
- `compose.yaml`에서 OpenSearch 이미지 버전을 고정하고 data volume을 유지한다.
- 개발 환경에서는 외부 포트 노출을 최소화하고 security plugin 비활성화 구성을 로컬에서만 사용한다.

Windows 설정 예시:

```powershell
wsl -d docker-desktop sysctl -w vm.max_map_count=262144
docker compose --profile search up -d opensearch
```

위 호스트 설정이 끝나면 로컬에서는 Compose 명령으로 실행할 수 있다. 현재 Compose에는 OpenSearch client, Outbox 색인 Worker, index template과 검색 API가 연결되어 있다.

#### 실제 서버 운영 시 필요한 사용자 결정

운영에서는 다음 중 하나를 선택해야 한다.

1. AWS OpenSearch Service 같은 관리형 서비스를 사용한다.
2. EC2에 OpenSearch를 직접 운영한다.

관리형 서비스를 선택하면 사용자가 endpoint, 접근 정책/IAM, VPC 연결, 저장 용량, snapshot 정책을 준비하고 백엔드에 접속 정보를 환경 변수로 제공해야 한다. 직접 운영하면 host sysctl, TLS 인증서, Security plugin 계정/권한, 영구 디스크, snapshot 저장소, heap/디스크 모니터링까지 직접 관리해야 한다.

프로젝트 발표와 로컬 개발에는 single-node Compose로 충분하다. 인터넷에 공개하거나 실제 트래픽을 받는 환경에서는 security plugin을 끈 개발 구성을 사용하지 않는다.

### 6.2 배포 상세와 운영 지표

- `GET /api/deployments/:id`
- WAF reload revision/status 노출
- 배포 전후 탐지/차단 변화 비교
- 실패 원인과 rollback 대상 버전 표시

### 6.3 SSE 실시간 이벤트

- 신규 요청 로그
- 검증 progress와 라운드 변경
- 배포/reload 상태
- 관리자 승인 대기 알림

SSE endpoint는 단방향 상태 전달만 담당한다. 재연결 시 `Last-Event-ID` 또는 마지막 이벤트 시각을 사용하고, 연결 실패 시 기존 REST polling으로 fallback한다. 현재 플랫폼에는 브라우저가 서버와 지속적으로 양방향 통신해야 하는 기능이 없으므로 WebSocket은 구현 범위에서 제외한다.

관리자 인증은 현재의 단일 관리자 JWT 방식을 그대로 유지한다. 실제 요구가 생기기 전에는 refresh token, 역할 계층, 세션 저장소를 추가하지 않는다.

## 7. P2 — 실서비스 운영 강화

- 실제 정상 트래픽으로 validation dataset 확장
- 데이터셋 버전/승인/변경 감사 강화
- OpenSearch ILM/ISM 보존 정책
- Prometheus/Grafana 또는 외부 APM
- TLS, 실제 도메인, secret manager
- PostgreSQL backup/restore rehearsal
- Redis persistence/failover 정책
- AWS EC2 또는 관리형 서비스 배포
- rate limit, reverse proxy trust 설정, CORS 운영값 검증

## 8. 외부 GPT API 연결 상태

현재 AI 서비스는 구조화 출력과 deterministic fallback을 지원한다.

```env
AI_PROVIDER=openai
OPENAI_API_KEY=replace-with-real-key
AI_MODEL=gpt-4.1-mini
AI_MAX_OUTPUT_TOKENS=1200
AI_DAILY_CALL_LIMIT=50
ADVERSARIAL_MAX_ROUNDS=5
```

실제 키는 `apps/backend/.env`에서 Backend와 Worker에 전달된다. 유료 호출 smoke test는 필요할 때 한 번만 수행한다.

1. AI 우회 payload가 스키마 검증을 통과한다.
2. payload 개수/길이 제한이 적용된다.
3. timeout/429/5xx에서 검증 전체가 deterministic fallback으로 계속된다.
4. AI 후보 룰이 기존 탐지율/오탐률/우회율보다 나쁠 때 채택되지 않는다.
5. Holdout 데이터가 AI prompt에 포함되지 않는다.
6. `AiInvocation`에 provider/model/latency/status/hash/usage가 남는다.

GPT 연결과 OpenSearch 도입은 서로 독립적이다. GPT smoke test를 먼저 수행할 수 있으며, OpenSearch는 이후 대량 로그 검색과 리포트 근거 탐색을 강화한다.

## 9. 구현 순서

1. ProtectedService/RequestEvent/AiReport/ValidationRun/Audit 관련 Prisma migration
2. 보호 서비스 CRUD와 SSRF-safe 연결 테스트
3. `source`/`simulationId`와 테스트 공격 API
4. 로그 필터/페이지네이션/DTO 보강
5. 서비스·기간 기반 대시보드 집계
6. ValidationRun 선생성과 라운드별 progress 저장
7. AI 리포트 및 감사 로그 GET API
8. P0 API 통합 테스트와 Swagger 갱신
9. 실제 OpenAI/Gemini 키 smoke test
10. OpenSearch Outbox/BullMQ 색인과 검색 API
11. SSE와 운영 배포 구성

## 10. 프로젝트 최종 완성 기준

- 보호 서비스를 등록·수정·비활성화하고 안전하게 연결 테스트할 수 있다.
- 재로그인 후에도 보호 서비스와 상태가 DB에서 복원된다.
- 실제/시뮬레이션/텔레메트리 로그가 구분된다.
- 서비스·기간·분류·조치·공격 유형별로 로그를 조회할 수 있다.
- 대시보드는 프론트 목 데이터 없이 DB 집계만 사용한다.
- 로그 → 룰 → 룰 버전 → 검증 → 리포트 → 승인 → 배포 관계가 ID로 연결된다.
- 검증은 비동기로 실행되고 중간 진행률과 완료 결과가 복원된다.
- Holdout은 생성/강화에 사용되지 않고 무결성이 보장된다.
- AI가 만든 우회와 후보 룰은 직접 평가를 통과해야만 채택된다.
- Shadow와 관리자 승인을 거친 룰만 Active가 된다.
- WAF는 설정 검사와 reload ACK가 성공해야 배포 성공으로 기록된다.
- 모든 주요 관리자 행동이 감사 로그에 남는다.
- 신규 로그와 검증/배포 상태가 SSE로 갱신되고 polling fallback이 동작한다.
- OpenSearch에서 공격 로그 전문 검색과 기간/카테고리 집계가 가능하다.
- OpenSearch 장애가 원본 로그 저장과 WAF 동작을 중단시키지 않는다.

## 11. 실서비스 운영 기준

아래는 프로젝트 기능 개수와 별개로, 실제 외부 고객 트래픽을 받기 위한 기준이다.

- TLS와 실제 도메인, secret manager가 구성된다.
- PostgreSQL 자동 백업과 restore rehearsal이 검증된다.
- OpenSearch snapshot, 디스크 watermark, 보존 정책이 구성된다.
- Redis와 Worker 장애 시 재시도/복구 절차가 검증된다.
- Backend/WAF/OpenSearch에 health check와 운영 알림이 연결된다.
- 개인정보 보존 기간과 삭제 정책이 환경별로 적용된다.
- 부하 테스트로 API, DB, Queue, Search의 처리 한계를 측정한다.
- 장애 시 WAF 룰 rollback과 서비스 복구 절차를 문서화하고 실제로 연습한다.
- 개발용 기본 계정, 보안 비활성화 옵션, 공개 관리 포트를 제거한다.

프로젝트 최종 완성 기준은 기능과 데이터 흐름을 실제로 증명하는 범위이고, 실서비스 운영 기준은 장애·보안·복구까지 책임질 수 있는 범위다. 전자를 작게 만드는 대신 P0와 P1을 모두 구현하되, 후자를 완료했다고 과장하지 않는다.
