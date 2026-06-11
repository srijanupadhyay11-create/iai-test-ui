import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, StopCircle, PlayCircle, FileText,
  RefreshCw, CheckSquare, Square, ChevronRight,
  Loader2, Activity, Terminal, Eye, EyeOff,
  Plus, Minus, ArrowLeft, Folder, Users,
} from 'lucide-react';
import { TestCase, WsEvent } from '../types';
import { api } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from './StatusBadge';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Splits a file_path into the team and the "group key":
 *
 *  tests/team/file.spec.ts            → team='team',  key='file.spec.ts'   (isFolder=false)
 *  tests/team/subfolder/file.spec.ts  → team='team',  key='subfolder'      (isFolder=true)
 *  tests/team/a/b/file.spec.ts        → team='team',  key='a'              (isFolder=true)
 *
 * The group key is always parts[2]: either a subfolder name or a file name.
 */
function parseFilePath(fp: string): { team: string; key: string; isFolder: boolean; fileName: string } {
  const parts = fp.replace(/\\/g, '/').split('/');
  // parts[0] = 'tests', parts[1] = team, parts[2] = subfolder | file
  const team     = parts[1] ?? '(unknown)';
  const key      = parts[2] ?? fp;
  const isFolder = parts.length > 3;
  const fileName = parts[parts.length - 1];
  return { team, key, isFolder, fileName };
}

// ─── types ─────────────────────────────────────────────────────────────────────

interface Group {
  key: string;
  isFolder: boolean;
  tests: TestCase[];
  /** Only populated for folder groups — tests bucketed by their actual filename */
  byFile: Record<string, TestCase[]>;
}

// ─── TeamCard ─────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  testCount,
  fileCount,
  onClick,
}: {
  team: string;
  testCount: number;
  fileCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-xl p-6 text-center transition-all duration-200 w-full focus:outline-none"
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(99,102,241,0.5)';
        el.style.boxShadow   = '0 0 28px rgba(99,102,241,0.22), 0 6px 30px rgba(0,0,0,0.25)';
        el.style.transform   = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '';
        el.style.boxShadow   = '';
        el.style.transform   = '';
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(34,211,238,0.1))',
          border:     '1px solid rgba(99,102,241,0.3)',
          boxShadow:  '0 0 14px rgba(99,102,241,0.15)',
        }}
      >
        <Folder className="w-6 h-6" style={{ color: '#818cf8', filter: 'drop-shadow(0 0 5px rgba(99,102,241,0.6))' }} />
      </div>
      <p className="font-bold text-xl tracking-wide mb-1" style={{ color: 'var(--c-t1)' }}>
        {team}
      </p>
      <p className="text-sm font-medium" style={{ color: '#818cf8' }}>
        {testCount} test{testCount !== 1 ? 's' : ''}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--c-t5)' }}>
        {fileCount} file{fileCount !== 1 ? 's' : ''}
      </p>
    </button>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function TestCasesTab() {
  const navigate = useNavigate();

  // data
  const [tests,   setTests]   = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // view state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [collapsed,    setCollapsed]    = useState<Set<string>>(new Set());

  // selection (always scoped to the current team)
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // run config
  const [mode,    setMode]    = useState<'serial' | 'parallel'>('serial');
  const [workers, setWorkers] = useState(2);
  const [headed,  setHeaded]  = useState(false);

  // active run
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runningIds,  setRunningIds]  = useState<Set<number>>(new Set());
  const [runLogs,     setRunLogs]     = useState<string[]>([]);

  // ── load ──────────────────────────────────────────────────────────────────

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.tests.list();
      setTests(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTests(); }, [loadTests]);

  // reset selection + collapse when team changes
  useEffect(() => {
    setSelected(new Set());
    setCollapsed(new Set());
  }, [selectedTeam]);

  // ── websocket ─────────────────────────────────────────────────────────────

  const handleWsEvent = useCallback((event: WsEvent) => {
    if (event.type === 'test_update') {
      setTests(prev => prev.map(t =>
        t.id === event.testCaseId
          ? { ...t, last_status: event.status as any, last_duration: event.duration ?? t.last_duration, last_run_id: activeRunId ?? t.last_run_id }
          : t
      ));
      if (event.status !== 'in_progress') {
        setRunningIds(prev => { const n = new Set(prev); n.delete(event.testCaseId); return n; });
      }
    }
    if (event.type === 'run_log')     { setRunLogs(prev => [...prev.slice(-200), event.message]); }
    if (event.type === 'run_started') { setRunLogs([]); }
    if (event.type === 'run_completed' || event.type === 'run_stopped') {
      setActiveRunId(null);
      setRunningIds(new Set());
    }
  }, [activeRunId]);

  useWebSocket(handleWsEvent);

  // ── derived: team summary ─────────────────────────────────────────────────

  const teamSummary = useMemo(() => {
    const map: Record<string, { testCount: number; files: Set<string> }> = {};
    for (const t of tests) {
      const { team } = parseFilePath(t.file_path);
      if (!map[team]) map[team] = { testCount: 0, files: new Set() };
      map[team].testCount++;
      map[team].files.add(t.file_path);
    }
    return map;
  }, [tests]);

  // ── derived: groups for selected team ─────────────────────────────────────
  //
  // Group key = parts[2]:
  //   • file name  when the file is directly inside the team folder  (isFolder=false)
  //   • subfolder  when there is at least one directory level below  (isFolder=true)
  //
  // Within a folder group we further bucket by fileName so we can render
  // file-name separator rows when the folder contains multiple spec files.

  const groups = useMemo<Group[]>(() => {
    if (!selectedTeam) return [];

    const map: Record<string, Group> = {};

    for (const t of tests) {
      const { team, key, isFolder, fileName } = parseFilePath(t.file_path);
      if (team !== selectedTeam) continue;

      if (!map[key]) map[key] = { key, isFolder, tests: [], byFile: {} };
      map[key].tests.push(t);

      if (isFolder) {
        (map[key].byFile[fileName] ??= []).push(t);
      }
    }

    // sort: folder groups first (alphabetical), then file groups (alphabetical)
    return Object.values(map).sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
  }, [tests, selectedTeam]);

  const teamTests = useMemo(() => groups.flatMap(g => g.tests), [groups]);

  // ── selection helpers ─────────────────────────────────────────────────────

  const allTeamSelected = teamTests.length > 0 && teamTests.every(t => selected.has(t.id));
  const someSelected    = selected.size > 0;
  const isRunning       = runningIds.size > 0;

  function toggleTeamAll() {
    setSelected(allTeamSelected ? new Set() : new Set(teamTests.map(t => t.id)));
  }

  function groupAllSelected(g: Group) {
    return g.tests.length > 0 && g.tests.every(t => selected.has(t.id));
  }

  function groupSomeSelected(g: Group) {
    return g.tests.some(t => selected.has(t.id));
  }

  function toggleGroupAll(g: Group) {
    const all = groupAllSelected(g);
    setSelected(prev => {
      const n = new Set(prev);
      if (all) g.tests.forEach(t => n.delete(t.id));
      else     g.tests.forEach(t => n.add(t.id));
      return n;
    });
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  // ── run helpers ───────────────────────────────────────────────────────────

  async function runTests(ids: number[]) {
    setError(null); setRunLogs([]);
    try {
      const { runId } = await api.tests.run(ids, mode, mode === 'parallel' ? workers : 1, headed);
      setActiveRunId(runId);
      setRunningIds(new Set(ids));
      setSelected(new Set());
    } catch (e: any) { setError(e.message); }
  }

  async function stopRun() {
    if (!activeRunId) return;
    try { await api.tests.stop(activeRunId); } catch (e: any) { setError(e.message); }
  }

  // ── loading / empty ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3" style={{ color: 'var(--c-t3)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#818cf8' }} />
        <span className="text-sm">Loading test cases…</span>
      </div>
    </div>
  );

  if (tests.length === 0) return (
    <div className="text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}>
        <Activity className="w-8 h-8" style={{ color: 'var(--c-t5)' }} />
      </div>
      <p className="font-semibold mb-1" style={{ color: 'var(--c-t2)' }}>No test cases imported yet.</p>
      <p className="text-sm" style={{ color: 'var(--c-t5)' }}>
        Go to the landing page and click <strong style={{ color: 'var(--c-t3)' }}>Import Latest</strong>.
      </p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TEAM SELECTOR
  // ══════════════════════════════════════════════════════════════════════════

  if (!selectedTeam) {
    const teamList = Object.entries(teamSummary).sort(([a], [b]) => a.localeCompare(b));
    const cols = teamList.length <= 2 ? 'grid-cols-2'
               : teamList.length <= 4 ? 'grid-cols-2 sm:grid-cols-3'
               : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(34,211,238,0.1))',
              border:     '1px solid rgba(99,102,241,0.3)',
              boxShadow:  '0 0 20px rgba(99,102,241,0.15)',
            }}
          >
            <Users className="w-7 h-7" style={{ color: '#818cf8', filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.7))' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--c-t1)' }}>Select Your Team</h2>
          <p className="text-sm" style={{ color: 'var(--c-t5)' }}>
            Teams are the immediate folders inside{' '}
            <span className="font-mono" style={{ color: 'var(--c-t3)' }}>tests/</span>.
            Choose one to browse its test cases.
          </p>
        </div>

        <div className={`grid gap-4 ${cols}`}>
          {teamList.map(([team, info]) => (
            <TeamCard
              key={team}
              team={team}
              testCount={info.testCount}
              fileCount={info.files.size}
              onClick={() => setSelectedTeam(team)}
            />
          ))}
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--c-t6)' }}>
          {teamList.length} team{teamList.length !== 1 ? 's' : ''} · {tests.length} total tests
        </p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASES VIEW  (team selected)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl"
        style={{ background: 'var(--c-card)', border: '1px solid var(--c-bd0)', backdropFilter: 'blur(16px)' }}
      >
        {/* ← Teams */}
        <button
          onClick={() => setSelectedTeam(null)}
          className="flex items-center gap-1.5 text-sm font-medium transition-all duration-150 px-2.5 py-1.5 rounded-lg"
          style={{ color: 'var(--c-t5)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#818cf8';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--c-t5)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd0)';
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Teams
        </button>

        {/* Active team badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(34,211,238,0.08))',
            border:     '1px solid rgba(99,102,241,0.3)',
            color:      '#818cf8',
          }}
        >
          <Folder className="w-3.5 h-3.5" />
          {selectedTeam}
          <span className="text-xs font-normal ml-1" style={{ color: 'var(--c-t5)' }}>
            · {teamTests.length} tests
          </span>
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--c-bd0)' }} />

        {/* Select All (whole team) */}
        <button
          className="flex items-center gap-1.5 text-sm font-medium transition-all duration-150 px-2 py-1 rounded-lg"
          onClick={toggleTeamAll}
          style={{ color: allTeamSelected ? '#818cf8' : 'var(--c-t3)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = allTeamSelected ? '#818cf8' : 'var(--c-t3)')}
        >
          {allTeamSelected
            ? <CheckSquare className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.8))' }} />
            : <Square className="w-4 h-4" />}
          {allTeamSelected ? 'Deselect All' : 'Select All'}
        </button>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--c-bd0)' }} />

        {/* Serial / Parallel */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: mode === 'serial' ? '#818cf8' : 'var(--c-t5)' }}>Serial</span>
          <button
            onClick={() => setMode(m => m === 'serial' ? 'parallel' : 'serial')}
            className="relative inline-flex w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
            style={{
              background: mode === 'parallel' ? 'linear-gradient(135deg,#4f46e5,#6d28d9)' : 'var(--c-surface)',
              border:     '1px solid var(--c-bd)',
              boxShadow:  mode === 'parallel' ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
              style={{ transform: mode === 'parallel' ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
          <span className="text-xs font-medium" style={{ color: mode === 'parallel' ? '#818cf8' : 'var(--c-t5)' }}>Parallel</span>
          {mode === 'parallel' && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs" style={{ color: 'var(--c-t5)' }}>Workers:</span>
              <input
                type="number" min={1} max={16} value={workers}
                onChange={e => setWorkers(Math.max(1, Math.min(16, Number(e.target.value))))}
                className="w-14 input-field py-1 text-xs text-center"
                style={{ padding: '4px 8px' }}
              />
              {someSelected && (
                <span className="text-xs" style={{ color: 'var(--c-t4)' }}>
                  (eff: {Math.min(workers, selected.size)})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--c-bd0)' }} />

        {/* Headed / Headless */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: !headed ? '#818cf8' : 'var(--c-t5)' }}>Headless</span>
          <button
            onClick={() => setHeaded(h => !h)}
            className="relative inline-flex w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
            style={{
              background: headed ? 'linear-gradient(135deg,#0891b2,#0e7490)' : 'var(--c-surface)',
              border:     '1px solid var(--c-bd)',
              boxShadow:  headed ? '0 0 12px rgba(8,145,178,0.4)' : 'none',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 flex items-center justify-center"
              style={{ transform: headed ? 'translateX(20px)' : 'translateX(0)' }}
            >
              {headed
                ? <Eye    className="w-3 h-3" style={{ color: '#0891b2' }} />
                : <EyeOff className="w-3 h-3" style={{ color: '#94a3b8' }} />}
            </span>
          </button>
          <span className="text-xs font-medium" style={{ color: headed ? '#22d3ee' : 'var(--c-t5)' }}>Headed</span>
        </div>

        <div className="flex-1" />

        {error && (
          <span className="text-xs px-2 py-1 rounded-lg" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.08)' }}>
            {error}
          </span>
        )}

        <button className="btn-secondary text-xs py-1.5 px-3" onClick={loadTests}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>

        {isRunning ? (
          <button className="btn-danger text-xs py-1.5 px-4" onClick={stopRun}>
            <StopCircle className="w-3.5 h-3.5" /> Stop All
          </button>
        ) : (
          <button
            className="btn-primary text-xs py-1.5 px-4"
            disabled={!someSelected}
            onClick={() => runTests([...selected])}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Run {someSelected ? `(${selected.size})` : 'Selected'}
          </button>
        )}
      </div>

      {/* ── Groups ────────────────────────────────────────────────────────── */}
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.key);
        const allSel      = groupAllSelected(group);
        const someSel     = groupSomeSelected(group);

        // Display label: strip .spec.ts suffix for file groups
        const label = group.isFolder
          ? group.key
          : group.key.replace(/\.spec\.ts$/, '').replace(/\.spec$/, '');

        return (
          <div
            key={group.key}
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--c-bd0)' }}
          >
            {/* Group header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors duration-150"
              style={{
                background:   'var(--c-th)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--c-bd0)',
              }}
              onClick={() => toggleCollapse(group.key)}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--c-surface)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--c-th)')}
            >
              {/* +/- */}
              <div
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded"
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  border:     '1px solid rgba(99,102,241,0.28)',
                  color:      '#818cf8',
                }}
              >
                {isCollapsed ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              </div>

              {/* Icon */}
              {group.isFolder
                ? <Folder   className="w-4 h-4 flex-shrink-0" style={{ color: '#22d3ee' }} />
                : <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />}

              {/* Name */}
              <span className="font-semibold text-sm" style={{ color: 'var(--c-t1)' }}>
                {label}
              </span>

              {/* Count badge */}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  border:     '1px solid rgba(99,102,241,0.2)',
                  color:      '#818cf8',
                }}
              >
                {group.tests.length} test{group.tests.length !== 1 ? 's' : ''}
              </span>

              <div className="flex-1" />

              {/* Group Select All — stop click bubbling to collapse toggle */}
              <div className="flex items-center" onClick={e => e.stopPropagation()}>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium transition-all duration-150 px-2 py-1 rounded-lg"
                  onClick={() => toggleGroupAll(group)}
                  style={{ color: allSel ? '#818cf8' : 'var(--c-t4)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = allSel ? '#818cf8' : 'var(--c-t4)')}
                >
                  {allSel
                    ? <CheckSquare className="w-3.5 h-3.5" style={{ filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.7))' }} />
                    : someSel
                      ? <CheckSquare className="w-3.5 h-3.5" style={{ opacity: 0.4 }} />
                      : <Square className="w-3.5 h-3.5" />}
                  Select All
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {!isCollapsed && (
              <div style={{ background: 'var(--c-table)' }}>
                {group.isFolder
                  // ── Folder group: render each file as a sub-header then its tests ──
                  ? Object.entries(group.byFile).sort(([a], [b]) => a.localeCompare(b)).map(([fileName, fileTests]) => (
                      <React.Fragment key={fileName}>
                        {/* File separator row */}
                        <div
                          className="flex items-center gap-2 px-4 py-2"
                          style={{ background: 'var(--c-card)', borderBottom: '1px solid var(--c-bd0)' }}
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                          <span className="text-xs font-mono" style={{ color: 'var(--c-t4)' }}>{fileName}</span>
                        </div>
                        {/* Tests in this file */}
                        <TestTable
                          tests={fileTests}
                          selected={selected}
                          runningIds={runningIds}
                          isRunning={isRunning}
                          onToggle={toggleSelect}
                          onRunSingle={id => runTests([id])}
                          onStop={stopRun}
                          onNavigate={navigate}
                        />
                      </React.Fragment>
                    ))
                  // ── File group: render tests directly ──
                  : (
                    <TestTable
                      tests={group.tests}
                      selected={selected}
                      runningIds={runningIds}
                      isRunning={isRunning}
                      onToggle={toggleSelect}
                      onRunSingle={id => runTests([id])}
                      onStop={stopRun}
                      onNavigate={navigate}
                    />
                  )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Live run log ──────────────────────────────────────────────────── */}
      {activeRunId && (
        <div className="terminal">
          <div
            className="flex items-center gap-2 mb-3 pb-2.5"
            style={{ borderBottom: '1px solid rgba(34,211,238,0.1)' }}
          >
            <Terminal className="w-3.5 h-3.5" style={{ color: '#22d3ee' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--c-t5)' }}>
              Run #{activeRunId} — live output
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full animate-pulse-dot"
                style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
              />
              <span className="text-xs font-mono" style={{ color: 'var(--c-t5)' }}>LIVE</span>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-px">
            {runLogs.length > 0
              ? runLogs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{line}</div>
                ))
              : <span style={{ color: 'var(--c-t7)' }}>Waiting for output…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TestTable (extracted to avoid repetition) ────────────────────────────────

function TestTable({
  tests,
  selected,
  runningIds,
  isRunning,
  onToggle,
  onRunSingle,
  onStop,
  onNavigate,
}: {
  tests: TestCase[];
  selected: Set<number>;
  runningIds: Set<number>;
  isRunning: boolean;
  onToggle: (id: number) => void;
  onRunSingle: (id: number) => void;
  onStop: () => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <table className="cyber-table">
      <thead>
        <tr>
          <th className="w-10"></th>
          <th>Test Name</th>
          <th className="w-28">Status</th>
          <th className="w-20">Duration</th>
          <th className="w-24">Last Run</th>
          <th className="w-16 text-center">Run</th>
        </tr>
      </thead>
      <tbody>
        {tests.map(test => {
          const isChecked     = selected.has(test.id);
          const isTestRunning = runningIds.has(test.id);
          return (
            <tr
              key={test.id}
              style={isChecked ? { background: 'rgba(99,102,241,0.05)', boxShadow: 'inset 3px 0 0 rgba(99,102,241,0.4)' } : {}}
            >
              {/* Checkbox */}
              <td>
                <button
                  onClick={() => onToggle(test.id)}
                  className="transition-all duration-150"
                  style={{ color: isChecked ? '#818cf8' : 'var(--c-t5)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = isChecked ? '#818cf8' : 'var(--c-t5)')}
                >
                  {isChecked
                    ? <CheckSquare className="w-4 h-4" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.7))' }} />
                    : <Square className="w-4 h-4" />}
                </button>
              </td>

              {/* Name + describe */}
              <td>
                <div className="font-medium text-sm" style={{ color: 'var(--c-t2)' }}>{test.name}</div>
                {test.describe_block && (
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--c-t5)' }}>
                    <ChevronRight className="w-3 h-3" />
                    {test.describe_block}
                  </div>
                )}
              </td>

              {/* Status */}
              <td><StatusBadge status={test.last_status} /></td>

              {/* Duration */}
              <td className="font-mono text-xs" style={{ color: 'var(--c-t5)' }}>
                {formatDuration(test.last_duration)}
              </td>

              {/* Last run link */}
              <td>
                {test.last_run_id ? (
                  <button
                    onClick={() => onNavigate(`/runs/${test.last_run_id}`)}
                    className="text-xs flex items-center gap-1 transition-colors duration-150"
                    style={{ color: '#4f46e5' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#4f46e5')}
                  >
                    <FileText className="w-3 h-3" /> #{test.last_run_id}
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--c-t7)' }}>—</span>
                )}
              </td>

              {/* Run / Stop */}
              <td className="text-center">
                {isTestRunning ? (
                  <button
                    onClick={onStop}
                    title="Stop"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
                    style={{ background: 'rgba(244,63,94,0.09)', border: '1px solid rgba(244,63,94,0.22)', color: '#f43f5e' }}
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onRunSingle(test.id)}
                    disabled={isRunning}
                    title="Run this test"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(79,70,229,0.09)', border: '1px solid rgba(99,102,241,0.22)', color: '#818cf8' }}
                    onMouseEnter={e => {
                      if (!isRunning) {
                        (e.currentTarget as HTMLElement).style.boxShadow  = '0 0 10px rgba(99,102,241,0.35)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)';
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow  = 'none';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.22)';
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

