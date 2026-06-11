import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { initWebSocket } from './services/websocket.service.js';
import authRouter from './routes/auth.js';
import testsRouter from './routes/tests.js';
import runsRouter from './routes/runs.js';
import config from './config.js';

const PORT = config.server.port || 4000;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Latest run report (always overwritten by Playwright)
const reportPath = path.join(config.playwright.localFrameworkPath, config.playwright.reportOutputDir);
app.use('/playwright-report', express.static(reportPath));

// Per-run reports copied after each run so older reports are preserved
const perRunReportsPath = path.join(config.playwright.localFrameworkPath, 'playwright-reports');
app.use('/playwright-reports', express.static(perRunReportsPath));

// Trace zip files produced by Playwright
const tracePath = path.join(config.playwright.localFrameworkPath, config.playwright.traceOutputDir);
app.use('/test-results', express.static(tracePath, { index: false }));

app.use('/api/auth', authRouter);
app.use('/api/tests', testsRouter);
app.use('/api/runs', runsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`IAI Test server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});
