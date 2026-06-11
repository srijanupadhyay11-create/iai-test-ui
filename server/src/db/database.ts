import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../../data/iai_test.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    dob TEXT NOT NULL,
    organisation TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    describe_block TEXT DEFAULT '',
    last_status TEXT DEFAULT 'never_run',
    last_run_id TEXT DEFAULT NULL,
    last_duration INTEGER DEFAULT NULL,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, file_path)
  );

  CREATE TABLE IF NOT EXISTS test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'in_progress',
    mode TEXT DEFAULT 'serial',
    workers INTEGER DEFAULT 1,
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS test_run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    test_case_id INTEGER NOT NULL,
    status TEXT DEFAULT 'in_progress',
    output TEXT DEFAULT '',
    report_path TEXT DEFAULT NULL,
    trace_path TEXT DEFAULT NULL,
    duration INTEGER DEFAULT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (run_id) REFERENCES test_runs(run_id),
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id)
  );

  CREATE TABLE IF NOT EXISTS run_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_value INTEGER DEFAULT 0
  );

  INSERT OR IGNORE INTO run_counter (id, current_value) VALUES (1, 0);
`);

export function nextRunId(): string {
  db.prepare('UPDATE run_counter SET current_value = current_value + 1 WHERE id = 1').run();
  const row = db.prepare('SELECT current_value FROM run_counter WHERE id = 1').get() as { current_value: number };
  return String(row.current_value).padStart(5, '0');
}

export default db;
