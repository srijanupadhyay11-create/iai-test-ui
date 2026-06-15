import { Router, Response } from 'express';
import { rmSync, existsSync } from 'fs';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import db from '../db/database.js';
import config from '../config.js';

const router = Router();
router.use(requireAuth as any);

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await db.query(`
    SELECT tr.*,
           STRING_AGG(tc.name, '|||') as test_names
    FROM test_runs tr
    LEFT JOIN test_run_results trr ON tr.run_id = trr.run_id
    LEFT JOIN test_cases tc ON trr.test_case_id = tc.id
    GROUP BY tr.run_id, tr.id, tr.status, tr.mode, tr.workers, tr.total_tests,
             tr.passed_tests, tr.failed_tests, tr.started_at, tr.completed_at
    ORDER BY tr.started_at DESC
  `);

  const formatted = result.rows.map((r: any) => ({
    ...r,
    test_names: r.test_names ? r.test_names.split('|||') : [],
  }));

  res.json(formatted);
});

router.get('/:runId', async (req: AuthRequest, res: Response) => {
  const { runId } = req.params;

  const runResult = await db.query('SELECT * FROM test_runs WHERE run_id = $1', [runId]);
  if (runResult.rows.length === 0) return res.status(404).json({ error: 'Run not found' });

  const results = await db.query(`
    SELECT trr.*,
      COALESCE(tc.name, '[deleted]') as name,
      COALESCE(tc.file_path, '') as file_path,
      COALESCE(tc.describe_block, '') as describe_block
    FROM test_run_results trr
    LEFT JOIN test_cases tc ON trr.test_case_id = tc.id
    WHERE trr.run_id = $1
    ORDER BY tc.file_path, tc.name
  `, [runId]);

  res.json({ run: runResult.rows[0], results: results.rows });
});

router.delete('/', async (req: AuthRequest, res: Response) => {
  const reportsDir = path.join(config.playwright.localFrameworkPath, 'playwright-reports');
  if (existsSync(reportsDir)) {
    try {
      rmSync(reportsDir, { recursive: true, force: true });
    } catch (e) {
      console.error('[runs] Failed to remove playwright-reports:', e);
    }
  }

  await db.query('DELETE FROM test_run_results');
  await db.query('DELETE FROM test_runs');
  await db.query(`UPDATE test_cases SET last_status = 'never_run', last_run_id = NULL, last_duration = NULL`);

  res.json({ message: 'All run history cleared.' });
});

export default router;
