# OpenSearch 및 OWASP ZAP 백엔드

## OpenSearch

- `RequestEvent` 저장 트랜잭션에서 `SearchOutbox`를 함께 생성한다.
- BullMQ Worker가 Outbox를 OpenSearch `request-events-v1` 인덱스에 비동기 색인한다.
- 기존 PostgreSQL 이벤트도 Worker 시작 시 순차적으로 backfill한다.
- `GET /api/request-events/search`에서 전문 검색, 기간·분류·공격 유형·차단 필터와 집계를 제공한다.
- `GET /api/request-events/search/health`에서 검색 엔진 상태를 확인한다.
- OpenSearch 장애 시 PostgreSQL 조회로 전환하고 `degraded=true`를 반환한다.

## OWASP ZAP 자동 스캔

- ZAP 2.17.0을 GUI가 아닌 Docker daemon으로 실행한다.
- Backend가 BullMQ에 작업을 등록하고 Worker가 Spider와 Active Scan을 순서대로 실행한다.
- 대상은 `http://waf:8080/demo-shop`으로 고정하여 임의 외부 URL 스캔을 방지한다.
- 결과는 `SecurityScanRun`과 `SecurityScanFinding`에 저장한다.
- `GET /api/security-scans/:id/events`에서 진행률을 SSE로 제공한다.
- `GET /api/security-scans/compare?ruleId=...`에서 배포 전·후 결과를 비교한다.
- AI 검증 파이프라인이 끝나면 배포 전 스캔을 자동 등록하고, Active 배포가 끝나면 배포 후
  스캔을 자동 등록한다.

## 실행

```powershell
docker compose up -d --build
```

호스트의 8080 포트가 사용 중이라면 WAF 공개 포트만 변경한다. 컨테이너 내부 ZAP 대상 주소는
변하지 않는다.

```powershell
$env:WAF_PORT = "8081"
docker compose up -d
```

개발 환경 기본값은 `apps/backend/.env.example`을 참고한다. 실제 운영 환경에서는 OpenSearch
인증/TLS, 비밀 관리, 백업과 스캔 대상 allowlist를 별도로 구성해야 한다.
