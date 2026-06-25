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

// If the configured framework path doesn't exist (e.g. the Mac dev path was
// committed but we're running on Render), fall back to the Render default.
const RENDER_FRAMEWORK_PATH = '/opt/render/project/playwright-automation-framework';
if (!existsSync(config.playwright.localFrameworkPath) && existsSync(RENDER_FRAMEWORK_PATH)) {
  console.log(`[config] localFrameworkPath "${config.playwright.localFrameworkPath}" not found — using Render default: ${RENDER_FRAMEWORK_PATH}`);
  config.playwright.localFrameworkPath = RENDER_FRAMEWORK_PATH;
}

export default config;
