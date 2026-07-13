# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspaces monorepo.

- `apps/frontend`: React + TypeScript + Vite app using `styled-components`.
- `apps/frontend/src`: Frontend source files. Use `services/` for API clients and `types/` for shared frontend types.
- `apps/backend`: Express + TypeScript API server.
- `apps/backend/src`: Backend source files. Use `config/`, `routes/`, `controllers/`, `services/`, `schemas/`, `middlewares/`, `types/`, and `utils/` for server modules.
- `tsconfig.base.json`: Shared TypeScript compiler options.
- `dist` folders are build outputs and should not be edited or committed.

Tests are not configured yet. When added, place frontend tests near the component or feature they cover, and backend tests near the route/service they cover.

## Build, Test, and Development Commands

- `npm install`: Install dependencies for all workspaces.
- `npm run dev`: Run frontend and backend together.
- `npm run frontend:dev`: Run only the Vite frontend at `http://localhost:3000`.
- `npm run backend:dev`: Run only the Express backend at `http://localhost:4000`.
- `npm run typecheck`: Type-check all workspaces.
- `npm run build`: Build frontend static assets and compile backend TypeScript.
- `npm run lint`: Run ESLint across the monorepo.
- `npm run format:check`: Check Prettier formatting.
- `npm run format`: Format supported files with Prettier.
- `git commit`: Runs husky pre-commit hook, which calls lint-staged on staged files.

No `npm test` script exists yet.

## Coding Style & Naming Conventions

Use TypeScript for application code. Frontend files should use `.tsx` for React components and `.ts` for non-component utilities. Backend files should use `.ts`.

Prefer named exports for reusable modules. Use `PascalCase` for React components, `camelCase` for variables/functions, and descriptive names for route handlers and helpers. Keep components focused and move shared styled-components into dedicated style files when they grow.

Use ESLint and Prettier from the repository root. The formatting baseline is two-space indentation, double quotes, semicolons, and concise functions.

The pre-commit hook runs ESLint and Prettier only on staged files. If the hook rewrites files, stage those changes before committing.

## Testing Guidelines

Testing frameworks are not installed yet. Before adding tests, choose tools that match the stack, such as Vitest and React Testing Library for frontend code, and Vitest or Supertest for backend routes.

Use clear test names that describe behavior, for example `health route returns ok`. Keep tests deterministic and avoid relying on real network services.

## Commit & Pull Request Guidelines

Follow a simple conventional commit style with the related issue number:

- Use messages like `chore: 프로젝트 초기 세팅 #1` or `feat: 로그인 API 추가 #6`.
- Use the issue type prefix from the related issue when possible, such as `chore`, `feat`, `fix`, or `docs`.
- Do not reuse closed issue numbers for new work. Create a new issue first, then use that issue number in commits and PRs.
- Keep commits focused on one change.
- Write issue bodies and pull request descriptions in Korean.
- Pull requests should include a short summary, validation steps, linked issues, and screenshots for visible frontend changes.

## Security & Configuration Tips

Do not commit `.env` files. Use `apps/backend/.env.example` to document required variables. Keep API secrets server-side only, and expose frontend configuration through Vite environment variables only when it is safe for browsers.
