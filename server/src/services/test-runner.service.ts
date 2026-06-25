import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { readFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import db, { nextRunId } from '../db/database.js';
import { broadcast } from './websocket.service.js';
import config from '../config.js';

const FRAMEWORK_PATH = config.playwright.localFrameworkPath;
// Use the local playwright binary directly — avoids shell: true and PATH issues
const PLAYWRIGHT_BIN = path.join(FRAMEWORK_PATH, 'node_modules', '.bin', 'playwright');
const RESULTS_JSON_PATH = path.join(FRAMEWORK_PATH, 'test-results', 'results.json');

console.log(`[runner] FRAMEWORK_PATH : ${FRAMEWORK_PATH}`);
console.log(`[runner] PLAYWRIGHT_BIN : ${PLAYWRIGHT_BIN}`);
console.log(`[runner] Binary exists  : ${existsSync(PLAYWRIGHT_BIN)}`);

const activeProcesses = new Map<string, ChildProcess>();

export interface RunOptions {
  testIds: number[];
  mode: 'serial' | 'parallel';
  workers?: number;
  headed?: boolean;
}

interface TestCase {
  id: number;
  name: string;
  file_path: string;
  describe_block: string;
}

// ── results.json helpers ────────────────────────────────────────────────────

function readResultsJson(): any {
  if (!existsSync(RESULTS_JSON_PATH)) return null;
  try {
    return JSON.parse(readFileSync(RESULTS_JSON_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function findSpec(suites: any[], tc: TestCase): any | null {
  for (const suite of (suites ?? [])) {
    for (const spec of (suite.specs ?? [])) {
      if (
        spec.title === tc.name &&
        (!tc.describe_block || suite.title === tc.describe_block)
      ) {
        return spec;
      }
    }
    const found = findSpec(suite.suites ?? [], tc);
    if (found) return found;
  }
  return null;
}

function getRelativeTracePath(absPath: string): string | null {
  const testResultsDir = path.join(FRAMEWORK_PATH, 'test-results');
  const rel = path.relative(testResultsDir, absPath);
  return rel.startsWith('..') ? null : rel;
}

interface ResolvedResult {
  status: 'passed' | 'failed';
  duration: number | null;
  tracePath: string | null;
  output: string;
}

function resolveTestResult(suites: any[], tc: TestCase): ResolvedResult {
  const spec = findSpec(suites, tc);

  if (!spec) {
    return { status: 'failed', duration: null, tracePath: null, output: '' };
  }

  const status: 'passed' | 'failed' = spec.ok ? 'passed' : 'failed';
  const allResults: any[] = (spec.tests ?? []).flatMap((t: any) => t.results ?? []);
  const lastResult = allResults[allResults.length - 1];

  const traceAtt = lastResult?.attachments?.find((a: any) => a.name === 'trace' && a.path);
  const tracePath = traceAtt ? getRelativeTracePath(traceAtt.path) : null;

  const toText = (arr: any[]) =>
    (arr ?? []).map((s: any) => (typeof s === 'string' ? s : (s.text ?? ''))).join('');
  const output = toText(lastResult?.stdout) + toText(lastResult?.stderr);

  return { status, duration: lastResult?.duration ?? null, tracePath, output };
}

// ── per-run HTML report copy ────────────────────────────────────────────────

function copyReportForRun(runId: string): void {
  const reportSrc = path.join(FRAMEWORK_PATH, config.playwright.reportOutputDir);
  if (!existsSync(reportSrc)) return;
  const reportsDir = path.join(FRAMEWORK_PATH, 'playwright-reports');
  mkdirSync(reportsDir, { recursive: true });
  try {
    cpSync(reportSrc, path.join(reportsDir, runId), { recursive: true });
  } catch (e) {
    console.error(`[runner] Failed to copy report for run ${runId}:`, e);
  }
}

// ── main ────────────────────────────────────────────────────────────────────

export async function startTestRun(options: RunOptions): Promise<string> {
  const { testIds, mode, workers = 1, headed = false } = options;
  const runId = await nextRunId();

  const tcResults = await Promise.all(
    testIds.map(id => db.query('SELECT * FROM test_cases WHERE id = $1', [id]))
  );
  const testCases = tcResults.map(r => r.rows[0] as TestCase).filter(Boolean);

  await db.query(
    `INSERT INTO test_runs (run_id, status, mode, workers, total_tests) VALUES ($1, 'in_progress', $2, $3, $4)`,
    [runId, mode, workers, testCases.length]
  );

  for (const tc of testCases) {
    await db.query(
      `INSERT INTO test_run_results (run_id, test_case_id, status) VALUES ($1, $2, 'in_progress')`,
      [runId, tc.id]
    );
    await db.query(
      `UPDATE test_cases SET last_status = 'in_progress', last_run_id = $1 WHERE id = $2`,
      [runId, tc.id]
    );
  }

  broadcast({ type: 'run_started', runId, testIds, mode, workers });

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const grepPattern = testCases
    .map(tc => {
      const fileRelToTestDir = tc.file_path.replace(/^tests[\\/]/, '');
      const parts = [fileRelToTestDir, tc.describe_block, tc.name].filter(Boolean).map(esc);
      return `${parts.join(' ')}$`;
    })
    .join('|');

  const numWorkers = mode === 'parallel' ? Math.min(workers, testCases.length) : 1;

  const args = [
    'test',
    '--project', 'chromium',
    '--grep', grepPattern,
    '--workers', String(numWorkers),
    ...(headed ? ['--headed'] : []),
  ];

  const env: NodeJS.ProcessEnv = { ...process.env, PW_WORKERS: String(numWorkers) };
  if (!headed) env['CI'] = '1';

  const proc = spawn(PLAYWRIGHT_BIN, args, { cwd: FRAMEWORK_PATH, env });
  activeProcesses.set(runId, proc);
  let fullOutput = '';

  proc.on('error', (err) => {
    activeProcesses.delete(runId);
    const msg = `[ERROR] Failed to start Playwright process: ${err.message}\nCheck that the framework was cloned and 'npm ci' completed in startup.sh.\n`;
    broadcast({ type: 'run_log', runId, message: msg });
    (async () => {
      for (const tc of testCases) {
        await db.query(
          `UPDATE test_run_results SET status = 'failed', output = $1, completed_at = CURRENT_TIMESTAMP WHERE run_id = $2 AND test_case_id = $3`,
          [msg, runId, tc.id]
        );
        await db.query('UPDATE test_cases SET last_status = $1 WHERE id = $2', ['failed', tc.id]);
        broadcast({ type: 'test_update', runId, testCaseId: tc.id, status: 'failed', duration: null });
      }
      await finalizeRun(runId, 0, testCases.length, testCases.length);
    })().catch(e => console.error('[runner] Error handling spawn error:', e));
  });

  proc.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    fullOutput += text;
    broadcast({ type: 'run_log', runId, message: text });
  });
  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    fullOutput += text;
    broadcast({ type: 'run_log', runId, message: text });
  });

  proc.on('close', (code) => {
    activeProcesses.delete(runId);
    copyReportForRun(runId);

    const suites: any[] = readResultsJson()?.suites ?? [];

    (async () => {
      let passed = 0;
      let failed = 0;

      for (const tc of testCases) {
        const resolved: ResolvedResult = code === null
          ? { status: 'failed', duration: null, tracePath: null, output: fullOutput }
          : resolveTestResult(suites, tc);

        const status = code === null ? 'stopped' : resolved.status;

        await db.query(
          `UPDATE test_run_results
           SET status = $1, output = $2, trace_path = $3, duration = $4, completed_at = CURRENT_TIMESTAMP
           WHERE run_id = $5 AND test_case_id = $6`,
          [status, resolved.output || fullOutput, resolved.tracePath ?? null, resolved.duration ?? null, runId, tc.id]
        );

        await db.query(
          'UPDATE test_cases SET last_status = $1, last_duration = $2 WHERE id = $3',
          [status, resolved.duration ?? null, tc.id]
        );

        broadcast({ type: 'test_update', runId, testCaseId: tc.id, status, duration: resolved.duration });

        if (status === 'passed') passed++;
        else failed++;
      }

      await finalizeRun(runId, passed, failed, testCases.length);
    })().catch(err => console.error('[runner] Error finalising run:', err));
  });

  return runId;
}

async function finalizeRun(runId: string, passed: number, failed: number, total: number) {
  const overallStatus = failed === 0 ? 'passed' : 'failed';
  await db.query(
    `UPDATE test_runs SET status = $1, passed_tests = $2, failed_tests = $3, completed_at = CURRENT_TIMESTAMP WHERE run_id = $4`,
    [overallStatus, passed, failed, runId]
  );
  broadcast({ type: 'run_completed', runId, status: overallStatus, passed, failed, total });
}

export async function stopTestRun(runId: string): Promise<boolean> {
  const proc = activeProcesses.get(runId);
  if (!proc) return false;

  proc.kill('SIGTERM');
  activeProcesses.delete(runId);

  await db.query(
    `UPDATE test_run_results SET status = 'stopped', completed_at = CURRENT_TIMESTAMP WHERE run_id = $1 AND status = 'in_progress'`,
    [runId]
  );
  await db.query(
    `UPDATE test_cases SET last_status = 'stopped' WHERE last_run_id = $1 AND last_status = 'in_progress'`,
    [runId]
  );
  await db.query(
    `UPDATE test_runs SET status = 'stopped', completed_at = CURRENT_TIMESTAMP WHERE run_id = $1 AND status = 'in_progress'`,
    [runId]
  );
  broadcast({ type: 'run_stopped', runId });

  return true;
}
