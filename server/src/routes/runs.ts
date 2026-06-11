import { Router, Response } from 'express';
import { rmSync, existsSync } from 'fs';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import db from '../db/database.js';
import config from '../config.js';

const router = Router();
router.use(requireAuth as any);

router.get('/', (req: AuthRequest, res: Response) => {
  const runs = db.prepare(`
    SELECT tr.*,
           GROUP_CONCAT(tc.name, '|||') as test_names
    FROM test_runs tr
    LEFT JOIN test_run_results trr ON tr.run_id = trr.run_id
    LEFT JOIN test_cases tc ON trr.test_case_id = tc.id
    GROUP BY tr.run_id
    ORDER BY tr.started_at DESC
  `).all();

  const formatted = (runs as any[]).map(r => ({
    ...r,
    test_names: r.test_names ? r.test_names.split('|||') : [],
  }));

  res.json(formatted);
});

router.get('/:runId', (req: AuthRequest, res: Response) => {
  const { runId } = req.params;

  const run = db.prepare('SELECT * FROM test_runs WHERE run_id = ?').get(runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const results = db.prepare(`
    SELECT trr.*,
      COALESCE(tc.name, '[deleted]') as name,
      COALESCE(tc.file_path, '') as file_path,
      COALESCE(tc.describe_block, '') as describe_block
    FROM test_run_results trr
    LEFT JOIN test_cases tc ON trr.test_case_id = tc.id
    WHERE trr.run_id = ?
    ORDER BY tc.file_path, tc.name
  `).all(runId);

  res.json({ run, results });
});

// DELETE /api/runs — clear all run history, per-run HTML reports, and reset
// test-case statuses back to never_run.
router.delete('/', (req: AuthRequest, res: Response) => {
  // Remove per-run report folders
  const reportsDir = path.join(config.playwright.localFrameworkPath, 'playwright-reports');
  if (existsSync(reportsDir)) {
    try {
      rmSync(reportsDir, { recursive: true, force: true });
    } catch (e) {
      console.error('[runs] Failed to remove playwright-reports:', e);
    }
  }

  // Clear DB tables and reset test statuses
  db.prepare('DELETE FROM test_run_results').run();
  db.prepare('DELETE FROM test_runs').run();
  db.prepare(`
    UPDATE test_cases
    SET last_status = 'never_run', last_run_id = NULL, last_duration = NULL
  `).run();

  res.json({ message: 'All run history cleared.' });
});

export default router;
