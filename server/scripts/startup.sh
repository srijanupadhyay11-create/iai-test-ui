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

  echo "[startup] Framework ready at $FRAMEWORK_DIR"
else
  echo "[startup] Framework already present at $FRAMEWORK_DIR"
fi

# Install Chromium only if not already cached
if find "${HOME}/.cache/ms-playwright" -name "chrome" -type f 2>/dev/null | grep -q .; then
  echo "[startup] Chromium already installed, skipping."
else
  echo "[startup] Installing Playwright Chromium browser..."
  cd "$FRAMEWORK_DIR" && npx playwright install chromium
  echo "[startup] Chromium installed."
fi

# Return to project root and start the server
cd /opt/render/project/src/server
exec npx tsx src/index.ts
