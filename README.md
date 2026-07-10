# Siheung Monorepo

React + TypeScript + Vite 프론트엔드와 Express + TypeScript 백엔드를 npm workspaces로 관리하는 모노레포입니다.

## 프로젝트 구조

```text
apps/
  frontend/  React, TypeScript, Vite, styled-components
  backend/   Express, TypeScript
```

- `apps/frontend/src`: 프론트엔드 소스 코드입니다. 현재 화면은 Vite + React 기본 시작 화면입니다.
- `apps/frontend/public`: Vite가 직접 제공하는 정적 파일을 둡니다.
- `apps/backend/src/config`: 환경변수, Swagger 같은 서버 설정을 관리합니다.
- `apps/backend/src/routes`: Express 라우터를 관리합니다. API 기능별로 route 파일을 분리합니다.
- `apps/backend/src/middlewares`: 404 처리, 에러 처리 같은 공통 Express 미들웨어를 둡니다.
- `dist`: 빌드 결과물입니다. 직접 수정하거나 커밋하지 않습니다.

## 실행 명령어

```bash
npm install
npm run dev
npm run frontend:dev
npm run backend:dev
npm run typecheck
npm run lint
npm run format
npm run format:check
npm run build
```

- `npm run dev`: 루트에서 프론트엔드와 백엔드를 함께 실행합니다.
- `npm run frontend:dev`: 프론트엔드만 실행합니다. 주소는 `http://localhost:3000`입니다.
- `npm run backend:dev`: 백엔드만 실행합니다. 주소는 `http://localhost:4000`입니다.
- `npm run typecheck`: 전체 워크스페이스의 TypeScript 타입 검사를 실행합니다.
- `npm run lint`: ESLint로 코드 규칙을 검사합니다.
- `npm run format`: Prettier로 파일 포맷을 정리합니다.
- `npm run format:check`: 파일을 수정하지 않고 Prettier 포맷만 검사합니다.
- `npm run build`: 프론트엔드 빌드 파일과 백엔드 컴파일 결과물을 생성합니다.

각 앱 폴더로 이동해서 `npm run dev`를 직접 실행할 수도 있습니다.

## 기본 세팅

- **npm workspaces**: 루트에서 `apps/frontend`, `apps/backend`를 함께 관리합니다.
- **React + TypeScript + Vite**: 프론트엔드 개발 서버, HMR, 프로덕션 빌드를 제공합니다.
- **styled-components**: 프론트엔드 스타일을 TypeScript 컴포넌트와 함께 관리합니다.
- **Express + TypeScript**: 백엔드 API 서버를 TypeScript로 작성합니다.
- **프론트엔드 `@` alias**: `@/styles`처럼 `apps/frontend/src` 기준 import를 짧게 작성합니다.
- **백엔드 모듈 구조**: 서버 코드를 `config`, `routes`, `middlewares`로 분리합니다.
- **ESLint**: TypeScript, React Hooks, React Refresh 규칙을 검사합니다.
- **Prettier**: 코드 포맷을 일관되게 맞춥니다.
- **Swagger**: `http://localhost:4000/api-docs`에서 API 문서를 제공합니다.
- **husky + lint-staged**: 커밋 전에 staged 파일만 ESLint와 Prettier로 검사합니다.
- **환경변수 예시**: `apps/backend/.env.example`에 `PORT`, `CLIENT_ORIGIN` 예시를 둡니다.

## Git Hook

이 프로젝트는 husky와 lint-staged로 `pre-commit` 훅을 사용합니다.

`git commit`을 실행하면 staged 파일에 대해 아래 작업이 자동 실행됩니다.

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`: ESLint 자동 수정 + Prettier 포맷
- `*.json`, `*.md`, `*.css`, `*.html`, `*.yml`, `*.yaml`: Prettier 포맷

훅이 파일을 수정했다면 수정된 파일을 다시 `git add` 한 뒤 커밋하면 됩니다.

## 이슈와 PR

이슈 템플릿과 PR 템플릿을 제공합니다.

- **버그 제보**: 오류나 예상과 다른 동작을 등록합니다. 제목 prefix는 `fix: `입니다.
- **기능 요청**: 새 기능이나 개선 아이디어를 등록합니다. 제목 prefix는 `feat: `입니다.
- **일반 작업**: 설정, 문서, 리팩터링 같은 작업을 등록합니다. 제목 prefix는 `chore: `입니다.
- **PR 템플릿**: 작업 내용, 관련 이슈, 검증 방법, 화면 변경 여부를 작성합니다.

커밋 메시지는 관련 이슈 번호를 포함합니다.

```bash
git commit -m "chore: 프로젝트 초기 모노레포 세팅 #1"
git commit -m "feat: 로그인 API 추가 #6"
```

PR 본문에 `close #이슈번호`를 작성하면 PR이 merge될 때 해당 이슈가 자동으로 닫힙니다.

## API

- Health API: `GET http://localhost:4000/api/health`
- Swagger UI: `GET http://localhost:4000/api-docs`

Health API 응답 예시:

```json
{
  "status": "ok",
  "service": "@siheung/backend",
  "timestamp": "2026-07-10T00:00:00.000Z"
}
```

## 참고

`AGENTS.md`는 앱 실행에 필요한 파일이 아닙니다. AI 코딩 에이전트가 이 저장소에서 작업할 때 구조, 명령어, 커밋 규칙을 일관되게 따르도록 남겨둔 가이드입니다.
