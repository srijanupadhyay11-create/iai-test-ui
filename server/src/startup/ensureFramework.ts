import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import config from '../config.js';

export async function ensureFramework(): Promise<void> {
  const frameworkPath = config.playwright.localFrameworkPath;
  const playwrightBin = path.join(frameworkPath, 'node_modules', '.bin', 'playwright');

  console.log(`[framework] frameworkPath : ${frameworkPath}`);
  console.log(`[framework] playwrightBin : ${playwrightBin}`);
  console.log(`[framework] binary exists : ${existsSync(playwrightBin)}`);

  if (existsSync(playwrightBin)) {
    console.log('[framework] Binary already present — skipping setup.');
    return;
  }

  const token = config.github.token;
  if (!token) {
    console.error('[framework] FATAL: No GitHub token. Set PW_AUTO_GITHUB_TOKEN in Render env vars.');
    return;
  }
  // Show first 8 chars of token so we can verify it's the right one without exposing it.
  console.log(`[framework] Using token: ${token.slice(0, 8)}…`);

  // ── Clone ────────────────────────────────────────────────────────────────

  if (!existsSync(path.join(frameworkPath, '.git'))) {
    console.log(`[framework] Cloning playwright-automation-framework into ${frameworkPath} …`);
    try {
      execSync(
        `git clone https://${token}@github.com/srijanupadhyay11-create/playwright-automation-framework.git "${frameworkPath}"`,
        { stdio: 'inherit' }
      );
    } catch (e: any) {
      console.error(`[framework] git clone FAILED: ${e.message}`);
      console.error('[framework] Verify PW_AUTO_GITHUB_TOKEN is a valid, non-expired GitHub PAT with repo read access.');
      return;
    }
  } else {
    console.log('[framework] Repo already cloned — skipping clone.');
  }

  // ── npm install ──────────────────────────────────────────────────────────
  // Use npm install --include=dev, NOT npm ci:
  //   • npm ci fails when there is no package-lock.json
  //   • npm ci + NODE_ENV=production skips devDependencies (where playwright lives)

  console.log('[framework] Running npm install --include=dev …');
  try {
    execSync('npm install --include=dev', {
      cwd: frameworkPath,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
    });
  } catch (e: any) {
    console.error(`[framework] npm install FAILED: ${e.message}`);
    return;
  }

  // ── Chromium ─────────────────────────────────────────────────────────────

  const chromiumCache = path.join(process.env.HOME ?? '/root', '.cache', 'ms-playwright');
  const hasChromium = existsSync(chromiumCache) &&
    execSafe(`find "${chromiumCache}" -name "chrome" -type f`).trim().length > 0;

  if (!hasChromium) {
    console.log('[framework] Installing Playwright Chromium browser …');
    try {
      execSync('npx playwright install chromium', { cwd: frameworkPath, stdio: 'inherit' });
    } catch (e: any) {
      console.error(`[framework] Chromium install FAILED: ${e.message}`);
      return;
    }
  } else {
    console.log('[framework] Chromium already cached — skipping.');
  }

  // ── Final check ───────────────────────────────────────────────────────────

  if (existsSync(playwrightBin)) {
    console.log('[framework] Setup complete — binary confirmed.');
  } else {
    console.error(`[framework] PROBLEM: npm install finished but binary still missing at ${playwrightBin}`);
    console.error('[framework] Check that @playwright/test is in the framework package.json dependencies.');
  }
}

function execSafe(cmd: string): string {
  try { return execSync(cmd).toString(); } catch { return ''; }
}
