import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from repo root (one level above server/)
config({ path: resolve(__dirname, '../../.env') });
