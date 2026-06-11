export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organisation: string;
}

export interface TestCase {
  id: number;
  name: string;
  file_path: string;
  describe_block: string;
  last_status: 'never_run' | 'in_progress' | 'passed' | 'failed' | 'stopped';
  last_run_id: string | null;
  last_duration: number | null;
  imported_at: string;
}

export interface TestRun {
  id: number;
  run_id: string;
  status: 'in_progress' | 'passed' | 'failed' | 'stopped';
  mode: 'serial' | 'parallel';
  workers: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  started_at: string;
  completed_at: string | null;
  test_names: string[];
}

export interface TestRunResult {
  id: number;
  run_id: string;
  test_case_id: number;
  name: string;
  file_path: string;
  describe_block: string;
  status: 'in_progress' | 'passed' | 'failed' | 'stopped';
  output: string;
  report_path: string | null;
  trace_path: string | null;
  duration: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface RunDetail {
  run: TestRun;
  results: TestRunResult[];
}

export type WsEvent =
  | { type: 'run_started'; runId: string; testIds: number[]; mode: string; workers: number }
  | { type: 'run_completed'; runId: string; status: string; passed: number; failed: number; total: number }
  | { type: 'run_stopped'; runId: string }
  | { type: 'run_log'; runId: string; message: string }
  | { type: 'test_update'; runId: string; testCaseId: number; status: string; duration?: number }
  | { type: 'test_log'; runId: string; testCaseId: number; message: string };
