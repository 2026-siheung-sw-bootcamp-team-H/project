# GCP + Vercel 발표 배포 가이드

이 구성은 프론트엔드를 Vercel에 정적 배포하고, 백엔드 보안 스택을 GCP Compute Engine의
Docker Compose로 실행한다. 로컬 개발은 기존 `compose.yaml`을 계속 사용하며 운영 설정은
`compose.production.yaml`로 완전히 분리되어 있다.

## 최종 요청 경로

```text
Browser
  └─ https://<vercel>
       ├─ 화면 정적 파일
       ├─ /api/*             ── Vercel rewrite ──> Edge Nginx ──> Backend
       └─ /api/demo-shop/*   ── Vercel rewrite ──> Edge Nginx ──> WAF ──> Backend Demo Shop

GCP VM
  └─ Edge Nginx만 80/443 공개
       └─ Docker 내부: Backend, Worker, WAF, ZAP, PostgreSQL, Redis, OpenSearch
```

Vercel에는 `GCP_API_ORIGIN` 한 개만 둔다. OpenAI 키와 DB 비밀번호 등은 GCP VM의
`.env.production`에만 저장한다.

## 1. Vercel 프론트 1차 배포

Vercel에서 GitHub 저장소를 연결하고 다음 값을 선택한다.

- Root Directory: `apps/frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

첫 배포에서는 `GCP_API_ORIGIN`이 없어도 화면과 SPA 라우팅이 배포된다. API rewrite만
비활성 상태다. 이때 확보한 고정 Production 주소를 기록한다.

예: `https://anvil.vercel.app`

Preview 주소는 배포마다 달라질 수 있으므로 GCP의 `CLIENT_ORIGIN`에는 Production 주소를
사용한다.

## 2. GCP VM 준비

발표용 전체 스택은 OpenSearch와 ZAP까지 함께 실행하므로 최소 4 vCPU, 8 GB RAM을 권장한다.
Ubuntu VM에 Docker Engine과 Compose plugin, Git, OpenSSL을 설치하고 저장소를 clone한다.

GCP 방화벽에서는 다음 포트만 연다.

- 22: 본인 IP에서 SSH
- 80: 인증서 발급과 HTTPS redirect
- 443: 실제 서비스

5432, 6379, 4000, 8080, 8081, 8090, 9200은 열지 않는다.

OpenSearch 실행 전 VM에서 한 번 설정한다.

```bash
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-opensearch.conf
```

운영 WAF 룰 디렉터리는 고정 UID로 실행하는 백엔드가 쓸 수 있게 준비한다.

```bash
sudo chown -R 10001:10001 waf/rules
chmod +x scripts/prepare-production-env.sh waf/*.sh
```

## 3. 운영 ENV 자동 생성

아래 명령은 PostgreSQL, JWT, HMAC, Telemetry, ZAP 키를 자동 생성한다. 사용자가 별도로
이 값들을 만들거나 기억할 필요는 없다.

```bash
./scripts/prepare-production-env.sh \
  api.example.com \
  https://anvil.vercel.app \
  your-email@example.com
```

생성된 `.env.production`에서 `OPENAI_API_KEY`만 실제 키로 바꾼다. 이 파일은 Git에
포함되지 않으며 권한은 `600`으로 생성된다. 관리자 계정은 발표용 기존 값
`admin@sentinel.local` / `demo1234`를 유지한다.

설정 문법을 먼저 확인한다.

```bash
docker compose --env-file .env.production -f compose.production.yaml config --quiet
```

## 4. 내부 서비스 먼저 실행

아직 Edge Nginx와 Certbot은 실행하지 않는다.

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d --build \
  postgres redis opensearch backend worker waf zap otel-collector
```

상태와 내부 API를 확인한다.

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml exec backend \
  node -e "fetch('http://localhost:4000/api/health').then(async r=>{console.log(r.status,await r.text());process.exit(r.ok?0:1)})"
docker compose --env-file .env.production -f compose.production.yaml exec waf \
  curl -fsS "http://localhost:8080/demo-shop/search?q=desk"
```

이 단계에서는 VM 외부에서 내부 포트로 접근할 수 없는 것이 정상이다.

## 5. DNS와 HTTPS

GCP VM에는 고정 외부 IP를 할당한다. `api.example.com`의 A 레코드를 그 IP로 연결하고
DNS 전파를 확인한다. Edge Nginx가 아직 80 포트를 사용하기 전에 인증서를 발급한다.

```bash
docker compose --env-file .env.production -f compose.production.yaml \
  --profile certificate run --rm --service-ports certbot
```

인증서가 발급되면 Edge Nginx를 시작한다.

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d edge
curl -fsS https://api.example.com/edge-health
curl -fsS "https://api.example.com/demo-shop/search?q=desk"
curl -fsS https://api.example.com/api/health
```

Edge Nginx는 다음만 외부에 제공한다.

- `/api/*` → Backend
- `/demo-shop/*` → ModSecurity WAF → Backend Demo Shop
- 그 외 경로 → 404

## 6. Vercel과 GCP 최종 연결

Vercel Project Settings의 Production 환경변수에 다음 값을 추가한다.

```text
GCP_API_ORIGIN=https://api.example.com
```

Production을 재배포한다. `apps/frontend/vercel.mjs`가 다음 rewrite를 생성한다.

- `/api/demo-shop/*` → GCP의 `/demo-shop/*`
- `/api/*` → GCP의 `/api/*`
- 나머지 경로 → React SPA의 `/index.html`

브라우저는 계속 Vercel 도메인만 호출하므로 별도 프론트 API Base URL이 필요 없다.
백엔드 CORS의 `CLIENT_ORIGIN`은 앞에서 입력한 안정적인 Vercel Production 주소와 일치한다.

## 7. 발표 전 기능 확인

통합·부하 테스트가 아니라 발표 실패를 막기 위한 최소 점검만 수행한다.

1. 관리자 로그인
2. Demo Shop 정상 검색
3. 초기 ZAP 진단
4. 공격 요청과 로그 수집
5. 룰 생성
6. 최대 5라운드 AI 우회 검증과 Holdout 검증
7. AI 리포트 확인
8. Shadow 배포와 재진단
9. 관리자 승인
10. Active 배포와 배포 전·후 비교

장애 확인 명령:

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=200 \
  edge backend worker waf zap opensearch
```

## 인증서 갱신

짧은 발표 배포라면 발표 기간 중 갱신할 가능성은 낮다. 장기 유지 시에는 Edge를 잠시
중지하고 standalone 방식으로 갱신한 뒤 다시 시작한다.

```bash
docker compose --env-file .env.production -f compose.production.yaml stop edge
docker compose --env-file .env.production -f compose.production.yaml \
  --profile certificate run --rm --service-ports --entrypoint certbot certbot renew --standalone
docker compose --env-file .env.production -f compose.production.yaml up -d edge
```

## 로컬 개발 유지

운영 파일은 로컬 파일을 덮어쓰지 않는다.

- 로컬: `docker compose up -d`
- 운영: `docker compose --env-file .env.production -f compose.production.yaml ...`
- 로컬 프론트: `npm run frontend:dev`

로컬 Vite는 `/api/demo-shop` 요청을 `localhost:8081` WAF로 보내고 나머지 `/api` 요청을
`localhost:4000` 백엔드로 보낸다. `/demo-shop/*` React 화면 경로와 API 경로가 더 이상
충돌하지 않는다.
