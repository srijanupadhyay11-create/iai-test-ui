import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src/ → up 2 levels → iai-test-ui/ → config/
const CONFIG_PATH = path.join(__dirname, '../../config/github.config.json');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

// Secrets are injected via environment variables (GitHub Secrets / local .env).
// These override any value in the config file so the JSON is safe to commit.
if (process.env.PW_AUTO_GITHUB_TOKEN) config.github.token    = process.env.PW_AUTO_GITHUB_TOKEN;
if (process.env.PW_AUTO_JWT_SECRET)   config.server.jwtSecret = process.env.PW_AUTO_JWT_SECRET;

export default config;
