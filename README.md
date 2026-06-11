# IAI Test — Ishani Automation Intelligence

A full-stack web UI for managing and executing Playwright tests from the `playwright-automation-framework` GitHub repository.

---

## Architecture

```
iai-test-ui/
├── client/          # React 18 + TypeScript + Vite + Tailwind CSS (port 3000)
├── server/          # Node.js + Express + SQLite + WebSocket (port 4000)
├── config/
│   └── github.config.json   # GitHub repo & server configuration
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm 9+
- The `playwright-automation-framework` repo cloned locally at the path configured in `config/github.config.json`

---

## Setup

### 1. Clone this repo

```bash
git clone <this-repo-url>
cd iai-test-ui
```

### 2. Configure GitHub & paths

Edit `config/github.config.json`:

```json
{
  "github": {
    "owner": "srijanupadhyay11-create",
    "repo": "playwright-automation-framework",
    "branch": "main",
    "testsPath": "tests",
    "token": ""          // Optional: add your GitHub PAT for private repos
  },
  "playwright": {
    "localFrameworkPath": "/Users/srijanu/Git/playwright-automation-framework",
    "reportOutputDir": "playwright-report",
    "traceOutputDir": "test-results"
  },
  "server": {
    "port": 4000,
    "jwtSecret": "change-this-in-production"
  }
}
```

### 3. Install dependencies

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 4. Run development servers

Open two terminals:

**Terminal 1 — Backend (port 4000):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd client
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Usage

### First time

1. **Register** — Click "Register here" on the login page and create an account.
2. **Login** — Sign in with your credentials.
3. **Import Latest** — On the landing page, click **Import Latest** to fetch test cases from the GitHub `main` branch.
4. **Get Started** — Click **Get Started** to go to the Test Management screen.

### Running tests

- **Individual test**: Click the ▶ play button next to any test case.
- **Bulk run**: Tick the checkboxes for desired tests, then click **PLAY ALL**.
- **Stop**: Click the ■ stop button or **Stop All** while a run is in progress.
- **Serial vs Parallel**: Use the slider in the toolbar. In Parallel mode, enter the number of workers.

### Viewing results

- **Test Cases tab**: Shows the latest status, duration, and links to reports/traces for each test.
- **Test Runs tab**: Full history of all execution instances. Click a Run ID to see per-test results.

---

## Connecting to playwright-automation-framework

The server executes tests by running `npx playwright test` inside the local `playwright-automation-framework` directory configured at `playwright.localFrameworkPath` in `github.config.json`.

Make sure:
- The framework is installed (`npm install` inside the framework directory).
- Playwright browsers are installed (`npx playwright install`).

All tests run in **headless mode** (`CI=1` env var is set automatically).

---

## Real-time updates

The server pushes live status updates via WebSocket. The frontend automatically reconnects if the connection drops. No page refresh needed during test execution.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend   | Node.js, Express, tsx             |
| Database  | SQLite (better-sqlite3)           |
| Auth      | JWT (jsonwebtoken + bcryptjs)     |
| Real-time | WebSocket (ws)                    |
| Test exec | child_process → npx playwright    |
# iai-test-ui
