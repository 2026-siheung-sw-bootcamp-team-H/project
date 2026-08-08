<div align="center">
# ANVIL

**AI 보조형 자가개선 웹 방어 시그니처 플랫폼**

공격 요청을 수집·분석하고 방어 룰을 생성·검증한 뒤, 관리자 승인에 따라 WAF에 안전하게 배포합니다.

<br />

<img src="./readme-assets/anvil-onboarding.png" width="1000" alt="ANVIL onboarding page" />

</div>

---

## Table of contents

- [Introduction](#introduction)
- [Demo](#demo)
- [Feature Specification](#기능-명세)
- [System Architecture](#system-architecture)
- [ERD](#erd)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [How to Start](#how-to-start)
- [Developer](#developer)

## Introduction

ANVIL은 웹 공격 요청에서 반복되는 패턴을 찾아 방어 시그니처를 만들고, 우회 공격과 정상 요청을 이용해 룰을 검증한 뒤 WAF에 배포하는 보안 운영 플랫폼입니다.

Nginx·ModSecurity·OWASP CRS가 SQL Injection, XSS, Path Traversal 등의 의심 요청을 1차 탐지·차단합니다. ModSecurity 감사 로그는 OpenTelemetry Collector를 거쳐 Platform API로 수집되며, 운영 데이터는 PostgreSQL에, 검색·집계 데이터는 OpenSearch에 저장됩니다.

AI는 공격 의도 설명, 우회 방식 분석, 룰 개선 제안과 보안 리포트 생성을 보조합니다. 생성된 룰은 Sandbox·Holdout 검증과 AI 보강을 거쳐 리포트를 생성하고, 배포 전 OWASP ZAP 검증을 통과하면 Shadow 환경에 먼저 적용됩니다. 이후 Shadow 재검증과 관리자 승인을 거친 룰만 Active 상태로 전환됩니다.

### 주요 기능

- 보호할 웹 서비스 등록 및 연결 상태 확인
- WAF Gateway 기반 웹 공격 탐지·차단
- ModSecurity 감사 로그 수집·정규화·검색
- 공격 요청 기반 시그니처 룰 생성
- AI 보조 공격 분석 및 룰 개선 리포트
- Sandbox·Holdout·OWASP ZAP 검증
- Shadow 모니터링, 관리자 승인, Active 배포 및 Rollback
- OWASP CRS와 ANVIL 시그니처의 실제 차단 주체 추적

### 방어 룰 적용 흐름

```mermaid
flowchart LR
    A["1. 공격 탐지·로그 수집"] --> B["2. 요청 정규화·룰 생성"]
    B --> C["3. Sandbox·Holdout 검증"]
    C --> D["4. AI 리포트·배포 전 ZAP"]
    D --> E["5. Shadow 적용·재검증"]
    E --> F["6. 관리자 승인·Active 배포"]
    F -. 문제 발생 .-> G["Rollback"]
```

## Demo

### Demo Shop

보호 대상인 모의 쇼핑몰을 통해 정상 요청과 SQL Injection·XSS·Path Traversal 공격 요청을 재현합니다.

<p align="center">
  <img src="./readme-assets/demo/demo-shop.gif" width="900" alt="ANVIL Demo Shop" />
</p>

### Onboarding

보호할 서비스의 공개 주소와 Origin, WAF Proxy 정보를 등록하고 연결 상태를 확인합니다.

<p align="center">
  <img src="./readme-assets/demo/onboarding.gif" width="900" alt="ANVIL onboarding" />
</p>

### Dashboard

요청 수, 공격 탐지, 차단 현황, 룰 상태와 다음 운영 작업을 대시보드에서 확인합니다.

<p align="center">
  <img src="./readme-assets/demo/dashboard.gif" width="900" alt="ANVIL security dashboard" />
</p>

### Log Explorer

수집된 요청의 경로, 공격 유형, 심각도, 처리 결과와 실제 차단 주체를 조회합니다.

<p align="center">
  <img src="./readme-assets/demo/log-explorer.gif" width="900" alt="ANVIL log explorer" />
</p>

### Signature Rule Generation

탐지된 공격 요청을 기반으로 방어 시그니처를 생성하고 룰 정의와 버전 정보를 확인합니다.

<p align="center">
  <img src="./readme-assets/demo/rule-generation.gif" width="900" alt="ANVIL signature rule generation" />
</p>

<p align="center">
  <img src="./readme-assets/demo/rule-result.gif" width="900" alt="ANVIL signature rule result" />
</p>

### AI Report

공격 의도, 우회 방식, 검증 지표와 배포 권고 사항을 관리자 친화적인 리포트로 제공합니다.

<p align="center">
  <img src="./readme-assets/demo/ai-report.gif" width="900" alt="ANVIL AI security report" />
</p>

### OWASP ZAP Validation

배포 전후 OWASP ZAP 스캔으로 공격 탐지 여부와 새롭게 발생한 보안 문제를 검증합니다.

<p align="center">
  <img src="./readme-assets/demo/zap-validation.gif" width="900" alt="ANVIL OWASP ZAP validation" />
</p>

### Rule Deployment

검증을 통과한 룰을 Shadow 모드로 관찰한 뒤 관리자 승인에 따라 Active 상태로 배포합니다. 문제가 확인되면 적용된 룰을 Rollback할 수 있습니다.

<p align="center">
  <img src="./readme-assets/demo/rule-deployment.gif" width="900" alt="ANVIL rule deployment" />
</p>

<p align="center">
  <img src="./readme-assets/demo/deployment-result.gif" width="900" alt="ANVIL deployment result" />
</p>

## 기능 명세

관리자 로그인부터 서비스 연결, 요청 수집·분석, 룰 생성·검증, 승인·배포까지의 구현 범위입니다.

<p align="center">
  <img src="./readme-assets/feature-specification.png" width="1100" alt="ANVIL 기능 명세" />
</p>

## System Architecture

<p align="center">
  <img src="./readme-assets/system-architecture.png" width="1100" alt="ANVIL system architecture" />
</p>

## ERD

<p align="center">
  <img src="./readme-assets/erd.png" width="1100" alt="ANVIL ERD" />
</p>

## Tech Stack

### Frontend

<p>
  <img src="https://img.shields.io/badge/react-%2361DAFB.svg?&style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/typescript-%233178C6.svg?&style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/vite-%23646CFF.svg?&style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/react%20router-%23CA4245.svg?&style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/tanstack%20query-%23FF4154.svg?&style=for-the-badge&logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/zustand-%23443E38.svg?&style=for-the-badge&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/tailwind%20css-%2306B6D4.svg?&style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/recharts-%2322B5BF.svg?&style=for-the-badge&logoColor=white" alt="Recharts" />
  <img src="https://img.shields.io/badge/three.js-%23000000.svg?&style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/monaco%20editor-%23007ACC.svg?&style=for-the-badge&logoColor=white" alt="Monaco Editor" />
  <img src="https://img.shields.io/badge/lucide-%23F56565.svg?&style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide" />
</p>

### Backend

<p>
  <img src="https://img.shields.io/badge/node.js-%23339933.svg?&style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/express-%23000000.svg?&style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/prisma-%232D3748.svg?&style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/zod-%233E67B1.svg?&style=for-the-badge&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/swagger-%2385EA2D.svg?&style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
  <img src="https://img.shields.io/badge/jwt-%23000000.svg?&style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/bcrypt-%23338A3E.svg?&style=for-the-badge&logoColor=white" alt="bcrypt" />
  <img src="https://img.shields.io/badge/helmet-%23000000.svg?&style=for-the-badge&logoColor=white" alt="Helmet" />
</p>

### Database & Queue

<p>
  <img src="https://img.shields.io/badge/postgresql-%234169E1.svg?&style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/redis-%23FF4438.svg?&style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/bullmq-%23E11D48.svg?&style=for-the-badge&logoColor=white" alt="BullMQ" />
  <img src="https://img.shields.io/badge/opensearch-%23005EB8.svg?&style=for-the-badge&logo=opensearch&logoColor=white" alt="OpenSearch" />
</p>

### Security & Observability

<p>
  <img src="https://img.shields.io/badge/nginx-%23009639.svg?&style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/modsecurity-%2320232A.svg?&style=for-the-badge&logoColor=white" alt="ModSecurity" />
  <img src="https://img.shields.io/badge/owasp%20crs-%23000000.svg?&style=for-the-badge&logo=owasp&logoColor=white" alt="OWASP CRS" />
  <img src="https://img.shields.io/badge/owasp%20zap-%23000000.svg?&style=for-the-badge&logo=zaproxy&logoColor=white" alt="OWASP ZAP" />
  <img src="https://img.shields.io/badge/opentelemetry-%23000000.svg?&style=for-the-badge&logo=opentelemetry&logoColor=white" alt="OpenTelemetry" />
</p>

### AI

<p>
  <img src="https://img.shields.io/badge/openai%20api-%23412991.svg?&style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI API" />
</p>

### Testing & DevOps

<p>
  <img src="https://img.shields.io/badge/vitest-%236E9F18.svg?&style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/supertest-%23000000.svg?&style=for-the-badge&logoColor=white" alt="Supertest" />
  <img src="https://img.shields.io/badge/docker-%232496ED.svg?&style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/docker%20compose-%232496ED.svg?&style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/npm%20workspaces-%23CB3837.svg?&style=for-the-badge&logo=npm&logoColor=white" alt="npm workspaces" />
  <img src="https://img.shields.io/badge/github%20actions-%232088FF.svg?&style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/vercel-%23000000.svg?&style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

## Directory Structure

```text
siheung/
├─ apps/
│  ├─ frontend/               # React 관리자 콘솔과 Demo Shop
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ components/
│  │     ├─ data/
│  │     ├─ lib/
│  │     ├─ pages/
│  │     ├─ services/
│  │     ├─ shop/
│  │     ├─ stores/
│  │     └─ types/
│  └─ backend/                # Express API, Worker, Prisma
│     ├─ prisma/
│     │  ├─ migrations/
│     │  └─ schema.prisma
│     └─ src/
│        ├─ config/
│        ├─ controllers/
│        ├─ data/
│        ├─ middlewares/
│        ├─ routes/
│        ├─ services/
│        ├─ schemas/
│        ├─ types/
│        ├─ utils/
│        └─ worker.ts
├─ deploy/                    # 운영 배포용 Nginx 설정
├─ readme-assets/             # README 이미지와 시연 GIF
├─ scripts/                   # 개발·배포 보조 스크립트
├─ waf/                       # ModSecurity 설정, 생성 룰, Reload 스크립트
├─ compose.yaml               # 로컬 Docker Compose 환경
├─ compose.production.yaml    # 운영 Docker Compose 환경
├─ otel-collector.yaml
└─ package.json               # npm workspaces
```

## How to Start

### Prerequisites

- Node.js와 npm
- Docker Desktop 또는 Docker Engine + Compose
- OpenAI 기능을 사용할 경우 OpenAI API Key

### 1. Repository clone

```bash
git clone https://github.com/2026-siheung-sw-bootcamp-team-H/project.git
cd project
npm install
```

### 2. Environment variables

`apps/backend/.env.example`을 복사해 `apps/backend/.env`을 생성합니다.

```bash
cp apps/backend/.env.example apps/backend/.env
```

최소한 아래 값은 로컬 환경에 맞게 변경합니다.

```dotenv
JWT_SECRET=replace-with-at-least-32-random-characters
HMAC_SECRET=replace-with-another-32-random-characters
TELEMETRY_TOKEN=replace-with-a-random-service-token
ADMIN_PASSWORD=change-me

# AI 기능을 사용할 때만 설정
AI_PROVIDER=openai
OPENAI_API_KEY=
```

실제 `.env` 파일과 API Key는 저장소에 커밋하지 않습니다.

### 3. Infrastructure and backend

```bash
docker compose up --build -d
```

### 4. Frontend

```bash
npm run frontend:dev
```

### 5. Access

| 서비스       | URL                            |
| ------------ | ------------------------------ |
| Frontend     | http://localhost:3000          |
| Platform API | http://localhost:4000          |
| Swagger UI   | http://localhost:4000/api-docs |
| WAF Gateway  | http://localhost:8080          |
| OpenSearch   | http://localhost:9200          |

### Useful commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run build
docker compose logs -f
docker compose down
```

## Developer

| Profile                                                                       | Name   | Role       | GitHub                                 |
| ----------------------------------------------------------------------------- | ------ | ---------- | -------------------------------------- |
| <img src="https://github.com/ksm0520.png?size=100" width="80" alt="김승민" /> | 김승민 | Full Stack | [@ksm0520](https://github.com/ksm0520) |
