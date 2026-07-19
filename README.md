# Siheung Monorepo

React + TypeScript + Vite 프론트엔드와 Express + TypeScript 백엔드를 npm workspaces로 관리하는 모노레포입니다.

## 프로젝트 구조

```text
apps/
  frontend/  React, TypeScript, Vite, styled-components
  backend/   Express, TypeScript
```

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
- **Zod**: 백엔드 요청값 검증에 사용합니다.
- **Swagger**: `http://localhost:4000/api-docs`에서 API 문서를 제공합니다.
- **ESLint + Prettier**: 코드 규칙과 포맷을 통일합니다.
- **husky + lint-staged**: 커밋 전에 staged 파일만 검사합니다.

## 백엔드 폴더 역할

```text
apps/backend/src/
  config/       환경변수, Swagger 같은 설정
  controllers/  요청을 받고 응답을 보내는 계층
  middlewares/  검증, 에러 처리, 404 처리 같은 공통 처리
  routes/       API 주소와 controller 연결
  schemas/      Zod 요청 검증 스키마
  services/     실제 기능 규칙과 비즈니스 로직
  types/        공통 TypeScript 타입
  utils/        공통 헬퍼 함수
```

현재 예시로 `GET /api/health`가 `routes -> controllers -> services` 흐름으로 분리되어 있습니다.

## 프론트엔드 폴더 역할

```text
apps/frontend/src/
  assets/    이미지, 아이콘 같은 정적 리소스
  services/  백엔드 API 요청 함수와 apiClient
  types/     공통 TypeScript 타입
```

주제가 정해지면 아래 폴더를 추가해서 확장하면 됩니다.

```text
components/  공용 UI 컴포넌트
pages/       라우트에 연결되는 페이지 컴포넌트
routes/      프론트 라우터 설정
layouts/     공통 화면 레이아웃
hooks/       커스텀 React hook
stores/      전역 상태 관리
utils/       순수 유틸 함수
```

## API 응답 형태

성공 응답은 공통으로 `data` 안에 담습니다.

```json
{
  "data": {
    "status": "ok"
  }
}
```

에러 응답은 `error` 안에 담습니다.

```json
{
  "error": {
    "message": "Invalid request."
  }
}
```

## API

- Backend guide: `GET http://localhost:4000/`
- Health API: `GET http://localhost:4000/api/health`
- Swagger UI: `GET http://localhost:4000/api-docs`

Health API 응답 예시:

```json
{
  "data": {
    "status": "ok",
    "service": "@siheung/backend",
    "timestamp": "2026-07-10T00:00:00.000Z"
  }
}
```

## Git Hook

`git commit`을 실행하면 staged 파일에 대해 아래 작업이 자동 실행됩니다.

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`: ESLint 자동 수정 + Prettier 포맷
- `*.json`, `*.md`, `*.css`, `*.html`, `*.yml`, `*.yaml`: Prettier 포맷

훅이 파일을 수정했다면 수정된 파일을 다시 `git add` 한 뒤 커밋하면 됩니다.

## 이슈와 PR

이슈와 PR 본문은 한국어로 작성합니다.

커밋 메시지는 관련 이슈 번호를 포함합니다.

```bash
git commit -m "chore: 프로젝트 초기 세팅 #1"
git commit -m "feat: 로그인 API 추가 #6"
```

PR 본문에 `close #이슈번호`를 작성하면 PR이 merge될 때 해당 이슈가 자동으로 닫힙니다.

## 참고

`AGENTS.md`는 앱 실행에 필요한 파일이 아닙니다. AI 코딩 에이전트가 이 저장소에서 작업할 때 구조, 명령어, 커밋 규칙을 일관되게 따르도록 남겨둔 가이드입니다.
리드미 수정
