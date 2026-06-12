#!/bin/bash
set -e

FRAMEWORK_DIR="${PW_FRAMEWORK_PATH:-/opt/render/project/playwright-automation-framework}"

if [ ! -d "$FRAMEWORK_DIR/.git" ]; then
  echo "[startup] Cloning playwright-automation-framework..."

  if [ -z "$PW_AUTO_GITHUB_TOKEN" ]; then
    echo "[startup] ERROR: PW_AUTO_GITHUB_TOKEN is not set. Cannot clone private repo."
    exit 1
  fi

  git clone "https://${PW_AUTO_GITHUB_TOKEN}@github.com/srijanupadhyay11-create/playwright-automation-framework.git" "$FRAMEWORK_DIR"

  echo "[startup] Installing framework dependencies..."
  cd "$FRAMEWORK_DIR" && npm ci

  echo "[startup] Installing Playwright Chromium browser..."
  npx playwright install chromium

  echo "[startup] Framework ready at $FRAMEWORK_DIR"
else
  echo "[startup] Framework already present at $FRAMEWORK_DIR"
fi

# Return to project root and start the server
cd /opt/render/project/src/server
exec npx tsx src/index.ts
