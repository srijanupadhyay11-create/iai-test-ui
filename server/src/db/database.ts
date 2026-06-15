import '../env.js';
import pg from 'pg';

const { Pool } = pg;

// Supabase (or any PostgreSQL) connection string via DATABASE_URL env var.
// For local dev without Supabase, point to a local Postgres instance.
const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function query(sql: string, params?: any[]) {
  return pool.query(sql, params);
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      dob TEXT NOT NULL,
      organisation TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      describe_block TEXT DEFAULT '',
      last_status TEXT DEFAULT 'never_run',
      last_run_id TEXT DEFAULT NULL,
      last_duration INTEGER DEFAULT NULL,
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, file_path)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_runs (
      id SERIAL PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'in_progress',
      mode TEXT DEFAULT 'serial',
      workers INTEGER DEFAULT 1,
      total_tests INTEGER DEFAULT 0,
      passed_tests INTEGER DEFAULT 0,
      failed_tests INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP DEFAULT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS test_run_results (
      id SERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      test_case_id INTEGER NOT NULL,
      status TEXT DEFAULT 'in_progress',
      output TEXT DEFAULT '',
      report_path TEXT DEFAULT NULL,
      trace_path TEXT DEFAULT NULL,
      duration INTEGER DEFAULT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP DEFAULT NULL,
      FOREIGN KEY (run_id) REFERENCES test_runs(run_id),
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS run_counter (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_value INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    INSERT INTO run_counter (id, current_value) VALUES (1, 0)
    ON CONFLICT DO NOTHING
  `);
}

export async function nextRunId(): Promise<string> {
  await pool.query('UPDATE run_counter SET current_value = current_value + 1 WHERE id = 1');
  const result = await pool.query('SELECT current_value FROM run_counter WHERE id = 1');
  return String(result.rows[0].current_value).padStart(5, '0');
}

export default { query };
