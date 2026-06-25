import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src/ → up 2 levels → iai-test-ui/ → config/
const CONFIG_PATH = path.join(__dirname, '../../config/github.config.json');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

// Secrets and runtime overrides via environment variables.
if (process.env.PW_AUTO_GITHUB_TOKEN)  config.github.token                   = process.env.PW_AUTO_GITHUB_TOKEN;
if (process.env.PW_AUTO_JWT_SECRET)    config.server.jwtSecret               = process.env.PW_AUTO_JWT_SECRET;
if (process.env.PW_FRAMEWORK_PATH)     config.playwright.localFrameworkPath  = process.env.PW_FRAMEWORK_PATH;
if (process.env.PORT)                  config.server.port                    = parseInt(process.env.PORT, 10);

// If localFrameworkPath is a Mac-style path and PW_FRAMEWORK_PATH wasn't
// explicitly set, we're almost certainly on Render — switch to the Render default
// immediately, without waiting for the directory to exist.
if (!process.env.PW_FRAMEWORK_PATH && config.playwright.localFrameworkPath.startsWith('/Users/')) {
  const renderDefault = '/opt/render/project/playwright-automation-framework';
  console.log(`[config] Mac path detected — switching localFrameworkPath to: ${renderDefault}`);
  config.playwright.localFrameworkPath = renderDefault;
}

export default config;
