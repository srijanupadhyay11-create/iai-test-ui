import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import config from '../config.js';

export async function ensureFramework(): Promise<void> {
  const frameworkPath = config.playwright.localFrameworkPath;
  const playwrightBin = path.join(frameworkPath, 'node_modules', '.bin', 'playwright');

  if (existsSync(playwrightBin)) {
    console.log(`[framework] Binary already present at ${playwrightBin}`);
    return;
  }

  console.log(`[framework] Binary not found at ${playwrightBin} — running setup...`);

  const token = config.github.token;
  if (!token) {
    console.error('[framework] No GitHub token configured (PW_AUTO_GITHUB_TOKEN). Playwright tests will fail.');
    return;
  }

  // Clone if not already present
  if (!existsSync(path.join(frameworkPath, '.git'))) {
    console.log(`[framework] Cloning playwright-automation-framework into ${frameworkPath} ...`);
    execSync(
      `git clone https://${token}@github.com/srijanupadhyay11-create/playwright-automation-framework.git ${frameworkPath}`,
      { stdio: 'inherit' }
    );
  } else {
    console.log(`[framework] Repo already cloned at ${frameworkPath}, skipping clone.`);
  }

  // Install npm dependencies
  console.log('[framework] Running npm ci ...');
  execSync('npm ci', { cwd: frameworkPath, stdio: 'inherit' });

  // Install Chromium if not already cached
  const chromiumCache = path.join(process.env.HOME ?? '/root', '.cache', 'ms-playwright');
  const chromiumReady = existsSync(chromiumCache) &&
    execSyncSafe(`find "${chromiumCache}" -name "chrome" -type f`, '').trim().length > 0;

  if (!chromiumReady) {
    console.log('[framework] Installing Playwright Chromium browser ...');
    execSync('npx playwright install chromium', { cwd: frameworkPath, stdio: 'inherit' });
    console.log('[framework] Chromium installed.');
  } else {
    console.log('[framework] Chromium already cached, skipping install.');
  }

  console.log('[framework] Setup complete.');
}

function execSyncSafe(cmd: string, fallback: string): string {
  try { return execSync(cmd).toString(); } catch { return fallback; }
}
