# 프론트엔드·백엔드 연동 인계서

백엔드는 보호 서비스 등록부터 초기 보안 진단, 공격 분석, 룰 검증, Shadow 관찰,
Active 배포까지의 API와 상태를 제공한다. 프론트는 요청 개수나 로컬 데이터로
파이프라인 단계를 추측하지 않고, 백엔드가 반환한 상태와 `nextAction`을 기준으로
사용자의 다음 행동을 안내한다.

기술 이름은 보조 설명으로만 사용한다.

- 사용자 문구: `초기 보안 진단`, `모니터링 모드`, `실제 차단`
- 보조 설명: `OWASP ZAP 자동 진단`, `Shadow`, `Active`, `ModSecurity`

## 1. 전체 사용자 흐름

```text
시작 페이지
→ 관리자 로그인
→ 연결된 서비스 확인

서비스 없음
→ 서비스 등록
→ 연결 확인
→ 초기 보안 진단

서비스 있음
→ 대시보드
→ 백엔드 nextAction에 따른 다음 작업

초기 보안 진단
→ 페이지 탐색
→ 안전한 모의 공격
→ 발견 항목 정리

공격 없음
→ 진단 결과 확인
→ 대시보드에서 지속 관찰 또는 새 진단

공격 있음
→ 공격 로그 확인
→ 공격 선택
→ 방어 룰 생성
→ 최대 5라운드 우회 및 Holdout 검증
→ 검증 리포트 확인
→ Shadow 배포
→ Shadow 재진단 및 실제 트래픽 관찰
→ 관리자 승인 요청/승인
→ Active 배포
→ 배포 후 진단 및 전·후 비교
→ 대시보드에서 지속 관찰
```

한 번 완료한 흐름을 처음부터 다시 시작하도록 강제하지 않는다. 등록된 서비스와
진단·룰·배포 이력은 유지하며, 사용자는 대시보드와 각 상세 화면을 자유롭게
왕복할 수 있어야 한다.

## 2. 보호 서비스 등록 및 상세 화면

### 등록 순서

연결 테스트 API는 생성된 서비스 ID를 사용하므로 `서비스 등록`이
`서비스 연결 확인`보다 먼저 실행되어야 한다.

권장 UI는 주 버튼 하나로 두 요청을 순차 실행하는 방식이다.

```text
서비스 주소 입력
→ [서비스 등록 및 연결 확인]
→ 등록 성공
→ 연결 테스트
→ 연결 성공
→ [초기 보안 진단 시작]
```

요청을 분리해서 보여줄 때는 현재 상태에 해당하는 버튼 하나만 강조한다.

| 서비스 상태            | 주 버튼                 |
| ---------------------- | ----------------------- |
| 등록 전                | `서비스 등록`           |
| 등록 완료·연결 미확인  | `서비스 연결 확인`      |
| `CONNECTED`            | `초기 보안 진단 시작`   |
| `PENDING`, `UNHEALTHY` | `서비스 연결 다시 확인` |
| `DISABLED`             | `보호 다시 시작`        |

`DISABLED` 상태에서는 연결 테스트 API가 거부되므로 `보호 다시 시작`은 다음 두 요청을
순서대로 실행한다. 연결 테스트 전에는 절대 곧바로 `CONNECTED`로 변경하지 않는다.

```text
DISABLED
→ PATCH status=PENDING
→ 연결 테스트
→ 성공 시 CONNECTED
→ 실패 시 UNHEALTHY
```

초기 진단 버튼 아래에는 다음 설명을 표시한다.

> 연결한 서비스에 허용된 범위의 안전한 모의 공격을 실행하여 취약점과 공격 패턴을 확인합니다.

서비스 상세 화면에서 제공할 기능:

- `보안 진단 시작`
- `최근 진단 결과 보기`
- `공격 로그 보기`
- `서비스 연결 다시 확인`
- `보호 일시 중지`

ZAP은 주 버튼 이름으로 사용하지 않고 작은 설명으로 표시한다.

> OWASP ZAP을 이용한 자동 보안 진단

### API

- `GET /api/protected-services`
- `POST /api/protected-services`
- `GET /api/protected-services/:id`
- `PATCH /api/protected-services/:id`
- `POST /api/protected-services/:id/connection-test`
- `POST /api/protected-services/:id/initial-scan`

등록 요청 예시:

```json
{
  "name": "Demo Shop",
  "publicDomain": "https://shop.example.com",
  "originUrl": "https://origin.example.com",
  "proxyUrl": "https://waf.example.com",
  "connection": "Nginx + ModSecurity"
}
```

일반 사용자는 공개 주소와 원본 주소의 차이를 이해하기 어려우므로 입력 폼에 다음
설명을 제공한다.

- `publicDomain`: 사용자가 접속하는 서비스 주소
- `originUrl`: WAF를 거치기 전 원본 서버 주소
- `proxyUrl`: Nginx/ModSecurity가 적용된 보호 주소

외부 서비스 진단은 반드시 사용자가 소유하거나 진단 권한을 가진 대상만 허용한다.
백엔드는 허용 대상, 프로토콜, 내부망 접근 제한을 검증해야 한다.

## 3. 보안 진단 진행 화면

ZAP 진단과 방어 룰 생성은 서로 다른 작업이다. 현재 진단 API는 발견 항목 수집까지
담당하며, 룰은 관리자가 공격 로그를 선택한 뒤 생성한다.

진단 진행 UI:

```text
보안 진단 진행 중

✓ 서비스 연결 확인
✓ 페이지 탐색
● 모의 공격 실행
○ 발견 항목 분석
○ 진단 결과 정리
```

`방어 룰 생성`은 이 진행 목록에 포함하지 않는다. 진단과 룰 생성을 완전 자동화하려면
백엔드에 별도의 파이프라인 오케스트레이션 API가 필요하다.

진행 중 제공할 기능:

- `진행 상황 보기`
- `백그라운드에서 계속`
- `진단 중지` — 진단 취소 API가 추가된 후 제공

완료 후 제공할 기능:

- `진단 결과 확인`
- `공격 로그 확인`
- 공격이 있을 때 `이 공격으로 방어 룰 만들기`
- 공격이 없을 때 `새 보안 진단 시작`

라우트를 이동해도 진단은 백그라운드에서 계속되어야 한다. 프론트는 `scan.id`를
보관하고 다시 진입하면 현재 상태를 조회하거나 SSE에 재연결한다.

### 진단 종류

- `INITIAL_SCAN`: 서비스 등록 후 최초 진단
- `BEFORE_DEPLOYMENT`: 룰 배포 전 기준 진단
- `SHADOW_VERIFICATION`: Shadow 상태 재검증
- `AFTER_DEPLOYMENT`: Active 배포 후 최종 진단

### API

- `POST /api/security-scans`
- `GET /api/security-scans?protectedServiceId=:serviceId`
- `GET /api/security-scans/:id`
- `GET /api/security-scans/:id/events` — SSE
- `GET /api/security-scans/compare?ruleId=:ruleId`
- `GET /api/security-scans/health`

초기 진단 응답의 `scan.id`로 SSE에 연결한다. 별도의 WebSocket은 필요 없다.

진단 화면에는 진행률, 현재 단계, 위험도별 발견 수, 실패 사유, 재실행 버튼 및
배포 전·후 비교 결과를 표시한다. 백엔드가 제공하지 않는 진행 단계나 수치를
프론트에서 가짜로 계산하지 않는다.

## 4. 로그 및 공격 분석 화면

로그 DTO 필드:

- `protectedServiceId`
- `source`: `REAL | SIMULATION | TELEMETRY`
- `simulationId`

필터 예시:

```text
GET /api/request-events
  ?protectedServiceId=
  &source=SIMULATION
  &simulationId=
  &classification=ATTACK
  &category=SQL_INJECTION
```

ZAP이 만든 요청에는 `SIMULATION` 또는 `모의 공격` 배지를 표시하여 실제 사용자
공격과 혼동하지 않도록 한다.

공격 유형은 기술 이름과 사용자 설명을 함께 표시한다.

```text
SQL_INJECTION
데이터베이스 정보를 탈취하려는 요청

XSS
페이지에 악성 스크립트를 삽입하려는 요청
```

현재 API로 우선 제공할 기능:

- `공격 상세 보기`
- `이 공격으로 방어 룰 만들기`
- 서비스·출처·공격 유형 필터

다음 기능은 백엔드 API가 추가된 후 제공한다.

- `정상 요청으로 표시`
- `유사 공격 모아보기`
- `선택한 공격으로 룰 생성`
- 여러 공격 일괄 분석

룰 생성 API:

- `POST /api/signature-rules/generate`
- 요청 본문: `{ "requestEventId": "..." }`

## 5. 대시보드와 `nextAction`

대시보드는 발표와 실제 운영의 중심 화면이다. 등록된 서비스의 트래픽, 공격,
진단, 룰, Shadow, Active 상태를 계속 확인할 수 있어야 한다.

대시보드의 주 버튼은 프론트가 요청 존재 여부로 계산하지 않는다.
`GET /api/dashboard?serviceId=:serviceId`가 반환한 `nextAction`을 사용한다.

### 권장 상태와 버튼

| `nextAction`               | 주 버튼                   |
| -------------------------- | ------------------------- |
| `REGISTER_SERVICE`         | `보호 서비스 등록`        |
| `TEST_CONNECTION`          | `서비스 연결 확인`        |
| `RUN_INITIAL_SCAN`         | `초기 보안 진단 시작`     |
| `VIEW_SCAN_PROGRESS`       | `진단 진행 상황 보기`     |
| `VIEW_SCAN_RESULT`         | `진단 결과 확인`          |
| `NO_THREATS_FOUND`         | `현재 진단 결과 보기`     |
| `REVIEW_ATTACK_EVENTS`     | `공격 분석 결과 보기`     |
| `VALIDATE_RULE`            | `우회 검증 시작`          |
| `VIEW_VALIDATION_PROGRESS` | `검증 진행 상황 보기`     |
| `REVIEW_AI_REPORT`         | `AI 리포트 확인`          |
| `REVIEW_VALIDATION_REPORT` | `검증 리포트 확인`        |
| `DEPLOY_SHADOW`            | `모니터링 모드로 적용`    |
| `VIEW_SHADOW_PROGRESS`     | `모니터링 진행 상황 보기` |
| `REVIEW_SHADOW`            | `모니터링 결과 확인`      |
| `REQUEST_APPROVAL`         | `실제 차단 요청`          |
| `APPROVE_RULE`             | `실제 차단 승인`          |
| `DEPLOY_ACTIVE`            | `Active 차단 전환`        |
| `VIEW_DEPLOYMENT_PROGRESS` | `배포 진행 상황 보기`     |
| `VIEW_PROTECTION_RESULT`   | `보호 효과 확인`          |

초기 진단이 완료됐지만 공격이 0건인 경우를 반드시 분리한다.

```text
초기 보안 진단이 완료되었습니다.
현재 확인된 공격 패턴이 없습니다.

[진단 결과 보기] [새 보안 진단 시작]
```

현재 백엔드가 실제로 반환하는 `nextAction`은 다음과 같다. 프론트 1차 구현은 이
값들을 먼저 매핑한다.

```text
REGISTER_SERVICE
TEST_CONNECTION
RUN_INITIAL_SCAN
REVIEW_ATTACK_EVENTS
VALIDATE_RULE
REVIEW_AI_REPORT
REVIEW_SHADOW
APPROVE_RULE
DEPLOY_ACTIVE
VIEW_PROTECTION_RESULT
REVIEW_RULE
```

다음 값은 아직 백엔드에 없으므로 프론트에서 알 수 없는 문자열을 받은 것처럼
fallback UI로 처리하면 안 된다. 값이 추가되기 전까지 실제 작업 데이터를 조회해
화면 상태를 보완한다.

- `VIEW_SCAN_PROGRESS`
- `VIEW_SCAN_RESULT`
- `NO_THREATS_FOUND`
- `VIEW_VALIDATION_PROGRESS`
- `REVIEW_VALIDATION_REPORT`
- `DEPLOY_SHADOW`
- `VIEW_SHADOW_PROGRESS`
- `REQUEST_APPROVAL`
- `VIEW_DEPLOYMENT_PROGRESS`

현재 사용할 보완 데이터:

- 진단 진행: `SecurityScanRun.status`, `progress`
- 공격 없음: `status === COMPLETED && stage === INITIAL_SCAN && alertCount === 0`
- 검증 진행: `/api/jobs/:id`
- Shadow/Active 재진단: 배포 응답의 `securityScan`
- 배포 진행과 결과: 룰 상태 및 배포 응답

`alertCount`의 초기값도 0이므로 반드시 `COMPLETED` 상태와 함께 판별한다.

`nextAction` 문자열만으로 목적 리소스를 추측하지 않도록 장기적으로는 다음 구조를
권장한다.

```json
{
  "nextAction": {
    "type": "REVIEW_AI_REPORT",
    "resourceType": "signatureRule",
    "resourceId": "rule-id",
    "serviceId": "service-id"
  }
}
```

여러 룰과 여러 작업이 동시에 존재하는 실제 운영 환경에서는 최신 룰 하나만으로
전체 상태를 결정하지 않고, 우선순위가 가장 높은 미완료 작업을 반환해야 한다.

## 6. 룰 검증과 상태별 주 버튼

룰 상세 화면에는 상태에 따른 주 버튼 하나만 강조한다. 배포, 승인, 검증 버튼을
동시에 강조하지 않는다.

| 룰 상태                    | 주 버튼                             |
| -------------------------- | ----------------------------------- |
| `DRAFT`, `REVIEW_REQUIRED` | `우회 검증 시작`                    |
| 검증 작업 실행 중          | `검증 진행 상황 보기`               |
| `HOLDOUT_PASSED`           | `분석 리포트 보기`                  |
| 리포트 확인 완료           | `모니터링 모드로 적용`              |
| `SHADOW_MODE`              | `모니터링 결과 확인`                |
| 승인 요청 전               | `실제 차단 요청`                    |
| `APPROVAL_REQUIRED`        | `실제 차단 승인` 또는 `반려`        |
| `APPROVED`                 | `Active 차단 전환`                  |
| `ACTIVE`                   | `보호 결과 확인` 또는 `룰 되돌리기` |

관련 API:

- `GET /api/signature-rules/:id`
- `POST /api/signature-rules/:id/validate`
- `POST /api/signature-rules/:id/request-approval`
- `POST /api/signature-rules/:id/approve`
- `POST /api/signature-rules/:id/reject`
- `POST /api/signature-rules/:id/deploy`

## 7. AI 설정 상태와 리포트

프론트는 AI가 항상 연결되어 있다고 가정하지 않는다. `GET /api/ai/status`의
`enabled && configured`는 공급자와 API 키가 **설정됨**을 뜻하며 외부 AI 서버와의
실시간 연결 성공을 보장하지 않는다.

```ts
const aiConfigured = status.enabled && status.configured;
```

호출 타임아웃, 외부 서버 오류, 일일 한도 초과, 응답 검증 실패 시 백엔드는
`deterministic-fallback` 리포트를 생성한다. 전역 설정 상태와 개별 리포트 생성
결과를 구분해서 표시한다.

AI 연결 시:

```text
AI 우회 생성과 결정론적 변형을 최대 5라운드 검증합니다.
```

AI 미연결 시:

```text
결정론적 우회 변형을 최대 5라운드 검증합니다.
AI 연결 후 추가 우회 패턴 생성이 활성화됩니다.
```

표시 이름도 실제 상태에 맞춘다.

| AI 상태            | 버튼/화면 이름                           |
| ------------------ | ---------------------------------------- |
| 설정됨             | `AI 우회 검증`, `AI 분석 리포트`         |
| 설정 안 됨         | `우회 검증`, `검증 리포트`               |
| 개별 호출 fallback | `AI 호출 실패 · 기본 검증 리포트로 대체` |

룰 검증 작업 완료 응답의 `validationRunId`, `reportId`, `securityScanRunId`를 사용하고,
룰 상세 응답의 최신 `reports[0]`에 저장된 리포트를 표시한다. 프론트에서 로컬
리포트나 수치를 임의로 생성하지 않는다.

리포트 내용:

- 왜 공격으로 판단했는지
- 어떤 방어 룰이 만들어졌는지
- 공격 탐지율
- 정상 요청 오탐률
- 우회 성공률
- 신뢰도와 Holdout 결과
- 배포 권고

예시:

```text
AI 권고: 모니터링 모드 적용 가능

공격 탐지율 98%
정상 요청 오탐률 1.2%
우회 성공률 0%
```

AI 리포트에는 다음 고지를 항상 표시한다.

> AI의 설명은 참고 정보이며, 실제 차단 적용은 검증 지표와 관리자 승인 후 진행됩니다.

리포트 하단 기능:

- `모니터링 모드로 적용`
- `배포 보류`
- `관련 공격 로그 보기`
- `검증 결과 자세히 보기`
- `룰 수정 요청` — 관련 API가 추가된 후 제공

AI 상태 API:

- `GET /api/ai/status`
- 표시 항목: 활성화 여부, 공급자, 모델, 일일 호출 상한, 오늘 호출 수, 남은 호출 수

## 8. Shadow 모니터링과 승인

`Shadow`만 단독으로 표시하지 않고 사용자 설명을 함께 제공한다.

```text
모니터링 모드

실제 요청을 차단하지 않고,
새 방어 룰이 어떤 요청을 탐지하는지 확인합니다.
```

필요한 기능:

- `모니터링 모드 적용`
- `모의 공격으로 다시 확인` — 자동 재검증 실패 또는 재진단용
- `탐지 결과 보기`
- `실제 차단 요청`
- `룰 폐기`

ModSecurity 대상에 Shadow를 배포하고 ZAP이 활성화돼 있으면 백엔드가
`SHADOW_VERIFICATION` 진단을 자동 등록한다.

```text
[모니터링 모드로 적용]
→ Shadow 배포
→ securityScan 반환
→ Shadow 재검증 진행 화면
```

자동 등록 조건은 `targetType=MODSECURITY`이고 `ZAP_ENABLED=true`인 경우다.
배포 응답에 `securityScan`이 없으면 Shadow 적용 성공과 자동 재검증 실패를 구분해
안내하고 `모의 공격으로 다시 확인` 버튼을 제공한다.

### Shadow 지표

- `GET /api/signature-rules/:id/shadow-metrics`
- `observedRequests`
- `matchedRequests`
- `attackMatches`
- `normalHits`
- `estimatedFalsePositiveRate`
- `activeRecommended`

기존 `—` placeholder를 실제 응답으로 교체한다.

현재 백엔드에는 최소 관찰 요청 수나 최소 관찰 시간 조건이 없다. 프론트에서
`42 / 50`, `7분 / 10분` 같은 기준을 임의로 표시하지 않는다. 현재 승인 요청 조건은
최신 검증 리포트, Shadow 배포 상태, ZAP 활성화 시 배포 이후 완료된
`SHADOW_VERIFICATION`이다.

현재 표시할 값:

- 관찰 요청 수
- 매칭 요청 수
- 공격 탐지 수
- 정상 요청 오탐 수
- 추정 오탐률
- ZAP 재검증 완료 여부
- 백엔드의 Active 권고 여부

## 9. ModSecurity 원문과 배포

### ModSecurity 원문

- `GET /api/signature-rules/:id/artifact`
- `modSecurityRule`
- `mode`
- `artifactPath`
- `version`

프론트에서 `SecRule`을 재생성하지 않는다.

### 배포 응답

`POST /api/signature-rules/:id/deploy`는 배포 객체를 최상위로 반환하며 필요할 때
`securityScan`을 추가로 포함한다. 기존 `Deployment` 매핑을 유지하고,
`securityScan`이 있으면 해당 진행 화면으로 이동한다.

| 룰 상태             | 작업                         |
| ------------------- | ---------------------------- |
| `HOLDOUT_PASSED`    | Shadow 배포                  |
| `SHADOW_MODE`       | Shadow 재검증/관찰 결과 확인 |
| `APPROVAL_REQUIRED` | 승인 또는 반려               |
| `APPROVED`          | Active 배포                  |
| `ACTIVE`            | 보호 결과 확인 또는 롤백     |

## 10. Active 배포 후 보호 결과

배포 완료 메시지만 보여주지 않고 전·후 효과를 비교한다.

- `보호 효과 확인`
- `배포 전·후 비교`
- `최종 보안 진단 실행`
- `룰 되돌리기`

발표용 핵심 비교:

```text
배포 전: 공격 통과 8건
배포 후: 공격 차단 8건
정상 요청: 20건 정상 처리
```

비교 데이터는 `GET /api/security-scans/compare?ruleId=:ruleId` 응답을 사용하며
프론트에서 결과를 임의 생성하지 않는다.

## 11. 외부 서비스와 실제 WAF 배포 범위

현재 여러 외부 서비스를 등록하고 서비스별 연결 테스트와 ZAP 진단을 수행할 수
있지만, 실제 ModSecurity 자동 배포 대상은 Docker 환경의 로컬 WAF 한 개다.

| 서비스                      | 현재 지원 범위                                                  |
| --------------------------- | --------------------------------------------------------------- |
| Demo Shop                   | 등록, 진단, 룰 생성, Shadow, Active, Rollback 실제 적용         |
| 일반 외부 서비스            | 등록, 연결 확인, ZAP 진단, 룰 생성, 검증, ModSecurity 룰 Export |
| 원격 WAF 커넥터 연결 서비스 | 향후 Shadow, Active, Rollback 지원                              |

외부 서비스의 `실제 배포` 버튼은 비활성화하고 제한 이유와 `룰 내보내기`를 제공한다.
현재 지원 데이터 생성 과정은 모든 서비스에 동일한 로컬 `MODSECURITY` target을
만들 수 있으므로, 백엔드도 Demo Shop이 아닌 서비스가 로컬 WAF에 잘못 배포되지
않도록 대상 검증을 추가해야 한다.

## 12. 오류·감사·시스템 상태

- `GET /api/audit-logs`: 서비스 변경, 진단 시작, 승인, 배포 감사 이력
- ZAP 상태와 AI 상태는 설정 또는 시스템 상태 카드로 표시
- 오류 응답의 `error.code`를 기준으로 다음 행동 안내

중요 오류 코드:

- `SERVICE_CONNECTION_REQUIRED`
- `ZAP_SCAN_ALREADY_RUNNING`
- `BEFORE_DEPLOYMENT_SCAN_REQUIRED`
- `SHADOW_SCAN_REQUIRED`
- `AI_REPORT_REQUIRED`
- `APPROVAL_REQUIRED`

오류 메시지만 띄우지 말고 가능한 해결 버튼을 함께 제공한다.

```text
서비스 연결이 확인되지 않았습니다.
[서비스 연결 확인]
```

## 13. 현재 API로 제공할 기능과 추가 API가 필요한 기능

### 현재 API로 구현 가능

- 서비스 등록·수정·연결 테스트·비활성화
- 초기 및 단계별 보안 진단
- SSE 진단 진행 상황
- 로그 필터와 공격 상세
- 공격 하나로 룰 생성
- 최대 5라운드 검증과 저장된 리포트 조회
- Shadow 지표
- 승인 요청·승인·반려
- Shadow·Active·Rollback 배포
- 배포 전·후 진단 비교
- 감사 로그, ZAP 상태, AI 상태

### 백엔드 보강 후 구현

- 실행 중인 ZAP 진단 취소
- 공격을 정상 요청으로 재분류
- 유사 공격 그룹 조회
- 여러 공격 일괄 룰 생성
- 룰 수정 요청과 의견 기록
- 공격 0건 및 각 작업 진행 중 `nextAction`
- Shadow 관찰 완료 기준과 진행률
- 여러 동시 작업을 고려한 구조화된 `nextAction`

## 14. 프론트 구현 우선순위

시간이 부족하면 다음 순서로 구현한다.

1. 백엔드 `nextAction` 기반 대시보드 주 버튼
2. 서비스 등록 → 연결 확인 → 초기 보안 진단
3. 진단 진행 화면과 공격 0건/발견 분기
4. 공격 상세 → 룰 생성 → 우회 검증
5. 검증/AI 리포트 → Shadow 적용
6. Shadow 관찰 → 실제 차단 승인 → Active 적용
7. 배포 전·후 보호 효과 비교

핵심 버튼:

1. `서비스 등록 및 연결 확인`
2. `초기 보안 진단 시작`
3. `공격 분석 결과 보기`
4. `우회 검증 시작`
5. `분석 리포트 확인`
6. `모니터링 모드로 적용`
7. `실제 차단 승인`
8. `보호 효과 확인`

## 15. 프론트 배포에서 필요한 작업

- production용 프론트 Dockerfile
- 정적 파일 제공 Nginx
- `/api` → Backend reverse proxy
- `/demo-shop` → WAF reverse proxy
- 운영 도메인 기준 CORS 설정
- Vite 개발 서버 proxy에 의존하지 않는 동일 출처 구성

통합/E2E/부하 테스트는 현재 우선순위에서 제외한다.
