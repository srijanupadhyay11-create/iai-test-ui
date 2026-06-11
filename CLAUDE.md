# IAI Test UI — Codebase Guide

## Project Overview
Full-stack web app for managing and executing Playwright tests. Import tests from GitHub, run them (serial/parallel), view live output, HTML reports, and traces.

## Dev Commands
```bash
# Start backend (port 4000)
cd server && npm start

# Start frontend (port 3000)
cd client && npm run dev

# Both together (from root)
npm run dev
```

## Architecture
- **Backend:** Express + TypeScript + SQLite (`data/iai_test.db`) + WebSocket
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router v6
- **Config:** `config/github.config.json` (never commit secrets here)
- **No build step on server** — `tsx` runs TypeScript directly

## Key Rules
- Server runs with `tsx src/index.ts` — no compile step needed
- Playwright binary called WITHOUT `shell: true` (shell special chars in grep patterns)
- `PW_WORKERS` env var controls Playwright workers (set in test-runner.service.ts)
- Per-run reports saved to `playwright-reports/{runId}/` to preserve history
- results.json uses `specs[]` not `tests[]` at suite level (Playwright v1.30+)
- Grep pattern format: `{file-rel-to-testDir} {describe} {testname}$` with `|` joining

## Static Files Served (Express)
- `/playwright-report/` → latest run report
- `/playwright-reports/:runId/` → per-run preserved reports
- `/test-results/` → trace zip files

## UI Design System
- Brand: `brand-600` (blue/indigo via Tailwind config)
- Cards: `bg-white rounded-xl border border-gray-200`
- Buttons: `btn-primary`, `btn-secondary`, `btn-danger`
- Inputs: `input-field`
- Terminal/logs: `bg-gray-900 text-green-400 font-mono`

## GitHub CI/CD
- Workflows: `.github/workflows/`
- Self-hosted runner setup: `scripts/setup-runner.sh`
- Add secrets: `gh secret set NAME --body "value" --repo srijanupadhyay11-create/iai-test-ui`
