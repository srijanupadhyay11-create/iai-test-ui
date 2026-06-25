import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import config from '../config.js';

export async function ensureFramework(): Promise<void> {
  const frameworkPath = config.playwright.localFrameworkPath;
  const playwrightBin = path.join(frameworkPath, 'node_modules', '.bin', 'playwright');

  console.log(`[framework] Checking binary at: ${playwrightBin}`);

  if (existsSync(playwrightBin)) {
    console.log('[framework] Binary already present — framework ready.');
    return;
  }

  console.log('[framework] Binary not found — running framework setup...');

  const token = config.github.token;
  if (!token) {
    console.error('[framework] ERROR: No GitHub token (PW_AUTO_GITHUB_TOKEN). Cannot clone framework — tests will fail.');
    return;
  }

  try {
    if (!existsSync(path.join(frameworkPath, '.git'))) {
      console.log(`[framework] Cloning into ${frameworkPath} ...`);
      execSync(
        `git clone https://${token}@github.com/srijanupadhyay11-create/playwright-automation-framework.git "${frameworkPath}"`,
        { stdio: 'inherit' }
      );
    } else {
      console.log('[framework] Repo already cloned, skipping clone.');
    }

    console.log('[framework] Running npm ci ...');
    execSync('npm ci', { cwd: frameworkPath, stdio: 'inherit' });

    const chromiumCache = path.join(process.env.HOME ?? '/root', '.cache', 'ms-playwright');
    const hasChromium = existsSync(chromiumCache) &&
      execSyncSafe(`find "${chromiumCache}" -name "chrome" -type f`).trim().length > 0;

    if (!hasChromium) {
      console.log('[framework] Installing Playwright Chromium browser ...');
      execSync('npx playwright install chromium', { cwd: frameworkPath, stdio: 'inherit' });
    } else {
      console.log('[framework] Chromium already cached, skipping install.');
    }

    // Confirm binary is now present
    if (existsSync(playwrightBin)) {
      console.log('[framework] Setup complete — binary confirmed.');
    } else {
      console.error('[framework] WARNING: Setup ran but binary still not found at', playwrightBin);
    }
  } catch (err: any) {
    console.error('[framework] Setup failed:', err.message);
    console.error('[framework] Tests will fail until the framework is available.');
  }
}

function execSyncSafe(cmd: string): string {
  try { return execSync(cmd).toString(); } catch { return ''; }
}
