import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import db from '../db/database.js';
import { importTestsFromGitHub } from '../services/github.service.js';
import { startTestRun, stopTestRun } from '../services/test-runner.service.js';

const router = Router();
router.use(requireAuth as any);

router.get('/', (req: AuthRequest, res: Response) => {
  const tests = db.prepare(`
    SELECT * FROM test_cases ORDER BY file_path, name
  `).all();
  res.json(tests);
});

router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const tests = await importTestsFromGitHub();

    const importMany = db.transaction((items: typeof tests) => {
      if (items.length > 0) {
        // Sync: remove test_cases whose file_path no longer exists in GitHub.
        // runs.ts uses LEFT JOIN so orphaned test_run_results rows won't crash anything.
        const incomingPaths = [...new Set(items.map(t => t.file_path))];
        const placeholders = incomingPaths.map(() => '?').join(',');
        (db.prepare(`
          DELETE FROM test_cases
          WHERE file_path NOT IN (${placeholders})
        `) as any).run(...incomingPaths);
      }

      // Upsert all incoming tests
      const upsert = db.prepare(`
        INSERT INTO test_cases (name, file_path, describe_block)
        VALUES (?, ?, ?)
        ON CONFLICT(name, file_path) DO UPDATE SET describe_block = excluded.describe_block
      `);
      for (const t of items) {
        upsert.run(t.name, t.file_path, t.describe_block);
      }
    });

    importMany(tests);

    const allTests = db.prepare('SELECT * FROM test_cases ORDER BY file_path, name').all();
    res.json({ imported: tests.length, tests: allTests });
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

router.post('/stop/:runId', (req: AuthRequest, res: Response) => {
  const { runId } = req.params;
  const stopped = stopTestRun(runId);
  if (stopped) {
    res.json({ message: `Run ${runId} stopped` });
  } else {
    res.status(404).json({ error: 'Run not found or already completed' });
  }
});

export default router;
