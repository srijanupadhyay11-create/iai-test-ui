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

// Playwright's JSON reporter structure (v1.30+):
//   suite → suites[] → specs[] → { title, ok, tests[] → results[] }
// "specs" are the individual test definitions; "tests" inside a spec are
// per-project instances; "results" inside a test are per-retry attempts.
// "ok: true" on a spec means the test ultimately passed (all retries considered).

function findSpec(suites: any[], tc: TestCase): any | null {
  for (const suite of (suites ?? [])) {
    // Match at the describe-block level
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

  // spec.ok is Playwright's authoritative pass/fail (accounts for all retries)
  const status: 'passed' | 'failed' = spec.ok ? 'passed' : 'failed';

  // Flatten all results across all per-project test instances
  const allResults: any[] = (spec.tests ?? []).flatMap((t: any) => t.results ?? []);
  const lastResult = allResults[allResults.length - 1];

  const traceAtt = lastResult?.attachments?.find((a: any) => a.name === 'trace' && a.path);
  const tracePath = traceAtt ? getRelativeTracePath(traceAtt.path) : null;

  const toText = (arr: any[]) =>
    (arr ?? []).map((s: any) => (typeof s === 'string' ? s : (s.text ?? ''))).join('');
  const output = toText(lastResult?.stdout) + toText(lastResult?.stderr);

  return {
    status,
    duration: lastResult?.duration ?? null,
    tracePath,
    output,
  };
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
  const runId = nextRunId();

  const testCases = testIds
    .map(id => db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id) as TestCase)
    .filter(Boolean);

  db.prepare(`
    INSERT INTO test_runs (run_id, status, mode, workers, total_tests)
    VALUES (?, 'in_progress', ?, ?, ?)
  `).run(runId, mode, workers, testCases.length);

  for (const tc of testCases) {
    db.prepare(`INSERT INTO test_run_results (run_id, test_case_id, status) VALUES (?, ?, 'in_progress')`)
      .run(runId, tc.id);
    db.prepare(`UPDATE test_cases SET last_status = 'in_progress', last_run_id = ? WHERE id = ?`)
      .run(runId, tc.id);
  }

  broadcast({ type: 'run_started', runId, testIds, mode, workers });

  // Playwright's internal grep title format (from _grepTitleWithTags in Playwright source):
  //   "{project} {file-relative-to-testDir} {describe} {testname} @tags"
  // All joined with spaces. The $ anchor targets the end of the test name so we
  // match across all browser projects without knowing the project name upfront.
  // We strip the testDir prefix ("tests/") from file_path so it matches how
  // Playwright presents the path internally.
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const grepPattern = testCases
    .map(tc => {
      const fileRelToTestDir = tc.file_path.replace(/^tests[\\/]/, '');
      const parts = [fileRelToTestDir, tc.describe_block, tc.name].filter(Boolean).map(esc);
      return `${parts.join(' ')}$`;
    })
    .join('|');

  // In parallel mode set workers = number of selected tests so every test gets
  // its own worker slot and all run simultaneously. Cap at the user-chosen
  // workers value so they can still limit concurrency if they want.
  // In serial mode always use 1 worker regardless.
  const numWorkers = mode === 'parallel'
    ? Math.min(workers, testCases.length)
    : 1;

  const args = [
    'test',
    '--project', 'chromium',
    '--grep', grepPattern,
    '--workers', String(numWorkers),
    ...(headed ? ['--headed'] : []),
  ];

  // When running headed, omit CI=1 so Playwright doesn't force headless.
  const env: NodeJS.ProcessEnv = { ...process.env, PW_WORKERS: String(numWorkers) };
  if (!headed) env['CI'] = '1';

  const proc = spawn(PLAYWRIGHT_BIN, args, { cwd: FRAMEWORK_PATH, env });

  activeProcesses.set(runId, proc);
  let fullOutput = '';

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

    // Copy the freshly-generated HTML report into a per-run folder so later
    // runs don't overwrite it.
    copyReportForRun(runId);

    const jsonResults = readResultsJson();
    const suites: any[] = jsonResults?.suites ?? [];

    let passed = 0;
    let failed = 0;

    for (const tc of testCases) {
      let resolved: ResolvedResult;
      if (code === null) {
        // Process was killed (stopped by user)
        resolved = { status: 'failed', duration: null, tracePath: null, output: fullOutput };
      } else {
        resolved = resolveTestResult(suites, tc);
      }

      const status = code === null ? 'stopped' : resolved.status;

      db.prepare(`
        UPDATE test_run_results
        SET status = ?, output = ?, trace_path = ?, duration = ?, completed_at = CURRENT_TIMESTAMP
        WHERE run_id = ? AND test_case_id = ?
      `).run(status, resolved.output || fullOutput, resolved.tracePath, resolved.duration, runId, tc.id);

      db.prepare('UPDATE test_cases SET last_status = ?, last_duration = ? WHERE id = ?')
        .run(status, resolved.duration, tc.id);

      broadcast({ type: 'test_update', runId, testCaseId: tc.id, status, duration: resolved.duration });

      if (status === 'passed') passed++;
      else failed++;
    }

    finalizeRun(runId, passed, failed, testCases.length);
  });

  return runId;
}

function finalizeRun(runId: string, passed: number, failed: number, total: number) {
  const overallStatus = failed === 0 ? 'passed' : 'failed';
  db.prepare(`
    UPDATE test_runs
    SET status = ?, passed_tests = ?, failed_tests = ?, completed_at = CURRENT_TIMESTAMP
    WHERE run_id = ?
  `).run(overallStatus, passed, failed, runId);

  broadcast({ type: 'run_completed', runId, status: overallStatus, passed, failed, total });
}

export function stopTestRun(runId: string): boolean {
  const proc = activeProcesses.get(runId);
  if (!proc) return false;

  proc.kill('SIGTERM');
  activeProcesses.delete(runId);

  db.prepare(`
    UPDATE test_run_results SET status = 'stopped', completed_at = CURRENT_TIMESTAMP
    WHERE run_id = ? AND status = 'in_progress'
  `).run(runId);
  db.prepare(`
    UPDATE test_cases SET last_status = 'stopped'
    WHERE last_run_id = ? AND last_status = 'in_progress'
  `).run(runId);
  db.prepare(`
    UPDATE test_runs SET status = 'stopped', completed_at = CURRENT_TIMESTAMP
    WHERE run_id = ? AND status = 'in_progress'
  `).run(runId);
  broadcast({ type: 'run_stopped', runId });

  return true;
}
