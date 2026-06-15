import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import db from '../db/database.js';
import { importTestsFromGitHub } from '../services/github.service.js';
import { startTestRun, stopTestRun } from '../services/test-runner.service.js';

const router = Router();
router.use(requireAuth as any);

router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await db.query('SELECT * FROM test_cases ORDER BY file_path, name');
  res.json(result.rows);
});

router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const tests = await importTestsFromGitHub();

    if (tests.length > 0) {
      const incomingPaths = [...new Set(tests.map(t => t.file_path))];
      const placeholders = incomingPaths.map((_, i) => `$${i + 1}`).join(', ');
      await db.query(
        `DELETE FROM test_cases WHERE file_path NOT IN (${placeholders})`,
        incomingPaths
      );
    }

    for (const t of tests) {
      await db.query(
        `INSERT INTO test_cases (name, file_path, describe_block)
         VALUES ($1, $2, $3)
         ON CONFLICT (name, file_path) DO UPDATE SET describe_block = EXCLUDED.describe_block`,
        [t.name, t.file_path, t.describe_block]
      );
    }

    const allTests = await db.query('SELECT * FROM test_cases ORDER BY file_path, name');
    res.json({ imported: tests.length, tests: allTests.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run', async (req: AuthRequest, res: Response) => {
  const { testIds, mode, workers, headed } = req.body;

  if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
    return res.status(400).json({ error: 'testIds required' });
  }

  try {
    const runId = await startTestRun({ testIds, mode: mode || 'serial', workers: workers || 1, headed: !!headed });
    res.json({ runId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop/:runId', async (req: AuthRequest, res: Response) => {
  const { runId } = req.params;
  const stopped = await stopTestRun(runId);
  if (stopped) {
    res.json({ message: `Run ${runId} stopped` });
  } else {
    res.status(404).json({ error: 'Run not found or already completed' });
  }
});

export default router;
