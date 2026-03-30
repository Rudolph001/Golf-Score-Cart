# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Golf scorecard app for Shelley Point Golf Club with distance-to-pin tracking.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, Framer Motion, React Hook Form, Lucide React

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── golf-scorecard/     # React Vite frontend - Golf Scorecard app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Features

### Golf Scorecard App (Shelley Point Golf Club)
- Track scores for 1-4 players per round
- Hole-by-hole score entry with large touch-friendly buttons (Raspberry Pi display optimised)
- Distance to pin in metres for each hole (men's and ladies' tees)
- Par and stroke index (handicap difficulty) for each hole
- Running gross and net score calculations
- Score colour coding: Eagle=gold, Birdie=blue, Par=neutral, Bogey=red, Double+=dark red
- Round history with past scorecards
- Full 18-hole scorecard grid view
- New round setup: enter player names and handicaps

### Shelley Point Course Data (18 holes)
Hardcoded in `artifacts/api-server/src/routes/course.ts`:
- All 18 holes with: par, distance (men's/ladies' in metres), stroke index, hole name

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/golf-scorecard` (`@workspace/golf-scorecard`)
React + Vite frontend. Routes: Home (recent rounds), New Round, Play Hole (score entry), Scorecard Detail.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server.
- `GET /api/course/holes` — returns all 18 hole details for Shelley Point
- `GET /api/scorecards` — list all scorecards
- `POST /api/scorecards` — create new scorecard
- `GET /api/scorecards/:id` — get scorecard
- `PUT /api/scorecards/:id` — update hole scores
- `DELETE /api/scorecards/:id` — delete scorecard

### `lib/db` (`@workspace/db`)
- `scorecards` table: id, date, players (JSONB), hole_scores (JSONB), timestamps
- Run migrations: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)
Run codegen: `pnpm --filter @workspace/api-spec run codegen`
