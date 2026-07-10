# Siheung Monorepo

React + TypeScript + Vite frontend and Express + TypeScript backend in an npm workspaces monorepo.

## Project Structure

```text
apps/
  frontend/  React, TypeScript, Vite, styled-components
  backend/   Express, TypeScript
```

- `apps/frontend/src`: Frontend source code. The current screen is the default Vite + React starter screen.
- `apps/frontend/public`: Static files served directly by Vite.
- `apps/backend/src/config`: Server configuration such as environment values and Swagger setup.
- `apps/backend/src/routes`: Express routers. Each API area should get its own route file.
- `apps/backend/src/middlewares`: Reusable Express middleware such as 404 and error handlers.
- `dist`: Build output. Do not edit or commit this directory.

## Commands

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

- `npm run dev`: Run frontend and backend together from the repository root.
- `npm run frontend:dev`: Run only the frontend at `http://localhost:3000`.
- `npm run backend:dev`: Run only the backend at `http://localhost:4000`.
- `npm run typecheck`: Run TypeScript checks for all workspaces.
- `npm run lint`: Run ESLint across the monorepo.
- `npm run format`: Format files with Prettier.
- `npm run format:check`: Check Prettier formatting without changing files.
- `npm run build`: Build frontend assets and compile backend TypeScript.

You can also run each app from its own folder with `npm run dev`.

## Base Setup

- **npm workspaces**: Manages `apps/frontend` and `apps/backend` from the root.
- **React + TypeScript + Vite**: Provides the frontend dev server, HMR, and production build.
- **styled-components**: Keeps frontend styles in TypeScript-friendly styled components.
- **Express + TypeScript**: Provides the backend API server in TypeScript.
- **Frontend `@` alias**: Lets frontend imports use paths like `@/styles` from `apps/frontend/src`.
- **Backend module structure**: Splits server code into `config`, `routes`, and `middlewares`.
- **ESLint**: Checks TypeScript, React Hooks, and React Refresh rules.
- **Prettier**: Keeps formatting consistent.
- **Swagger**: Serves API documentation at `http://localhost:4000/api-docs`.
- **husky + lint-staged**: Runs ESLint and Prettier on staged files before commit.
- **Environment example**: `apps/backend/.env.example` documents `PORT` and `CLIENT_ORIGIN`.

## Git Hooks

This project uses husky and lint-staged for the `pre-commit` hook.

When you run `git commit`, staged files are checked automatically:

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`: ESLint fixes and Prettier formatting.
- `*.json`, `*.md`, `*.css`, `*.html`, `*.yml`, `*.yaml`: Prettier formatting.

If the hook changes files, stage the updated files and commit again.

## PR and Issue Templates

A PR template is not the same as an issue template.

- PR template: shown when opening a pull request. It usually asks for summary, validation steps, related issue, and screenshots.
- Issue template: shown when creating an issue. It usually asks for bug details, feature request context, reproduction steps, or expected behavior.

## API

- Health API: `GET http://localhost:4000/api/health`
- Swagger UI: `GET http://localhost:4000/api-docs`

Health response example:

```json
{
  "status": "ok",
  "service": "@siheung/backend",
  "timestamp": "2026-07-10T00:00:00.000Z"
}
```

## Notes

`AGENTS.md` is not required to run the app. It is a contributor guide for AI coding agents so future edits follow the same structure, commands, and conventions.
