import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Loader2, BarChart2, ExternalLink, Trash2 } from 'lucide-react';
import { TestRun, WsEvent } from '../types';
import { api } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from './StatusBadge';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function formatDuration(start: string, end: string | null) {
  if (!end) return (
    <span className="font-mono text-xs animate-pulse-dot" style={{ color: '#22d3ee' }}>
      Running…
    </span>
  );
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function TestRunsTab() {
  const [runs,     setRuns]     = useState<TestRun[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.runs.list();
      setRuns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const clearRuns = useCallback(async () => {
    if (!window.confirm('Delete all run history and reports? This cannot be undone.')) return;
    setClearing(true);
    try {
      const token = localStorage.getItem('iai_token');
      await fetch('/api/runs', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRuns([]);
    } finally {
      setClearing(false);
    }
  }, []);

  const handleWsEvent = useCallback((event: WsEvent) => {
    if (event.type === 'run_started') { loadRuns(); }
    if (event.type === 'run_completed' || event.type === 'run_stopped') {
      setRuns(prev => prev.map(r =>
        r.run_id === event.runId
          ? { ...r, status: (event as any).status ?? 'stopped', completed_at: new Date().toISOString() }
          : r
      ));
    }
  }, [loadRuns]);

  const { isConnected } = useWebSocket(handleWsEvent);

  // Polling fallback: refresh run list every 5 s when WS is down and a run is in progress.
  useEffect(() => {
    const hasActiveRun = runs.some(r => r.status === 'in_progress');
    if (!hasActiveRun || isConnected) return;
    const interval = setInterval(loadRuns, 5000);
    return () => clearInterval(interval);
  }, [runs, isConnected, loadRuns]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3" style={{ color: 'var(--c-t3)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#818cf8' }} />
        <span className="text-sm">Loading runs…</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end gap-2">
        <button className="btn-secondary text-xs py-1.5 px-3" onClick={loadRuns}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button
          className="btn-danger text-xs py-1.5 px-3"
          onClick={clearRuns}
          disabled={clearing || runs.length === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {clearing ? 'Clearing…' : 'Clear Reports'}
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-20">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
          >
            <BarChart2 className="w-8 h-8" style={{ color: 'var(--c-t5)' }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--c-t2)' }}>No test runs yet.</p>
          <p className="text-sm" style={{ color: 'var(--c-t5)' }}>
            Go to the Test Cases tab and run some tests.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--c-table)', border: '1px solid var(--c-bd0)' }}
        >
          <table className="cyber-table">
            <thead>
              <tr>
                <th className="w-24">Run ID</th>
                <th>Tests</th>
                <th className="w-24">Mode</th>
                <th className="w-16 text-center">Total</th>
                <th className="w-16 text-center">Pass</th>
                <th className="w-16 text-center">Fail</th>
                <th className="w-28">Status</th>
                <th className="w-36">Started</th>
                <th className="w-24">Duration</th>
                <th className="w-16 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.run_id}>
                  <td>
                    <Link
                      to={`/runs/${run.run_id}`}
                      className="font-mono font-semibold text-sm transition-colors duration-150"
                      style={{ color: '#4f46e5' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#4f46e5')}
                    >
                      #{run.run_id}
                    </Link>
                  </td>

                  <td className="max-w-xs">
                    <div className="truncate text-xs leading-relaxed" style={{ color: 'var(--c-t4)' }}>
                      {run.test_names.slice(0, 3).join(', ')}
                      {run.test_names.length > 3 && (
                        <span style={{ color: 'var(--c-t5)' }}> +{run.test_names.length - 3} more</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-md capitalize"
                      style={{
                        color:      'var(--c-t3)',
                        background: 'var(--c-surface)',
                        border:     '1px solid var(--c-bd0)',
                      }}
                    >
                      {run.mode}
                      {run.mode === 'parallel' && (
                        <span style={{ color: 'var(--c-t5)' }}> ×{run.workers}</span>
                      )}
                    </span>
                  </td>

                  <td className="text-center font-semibold" style={{ color: 'var(--c-t3)' }}>
                    {run.total_tests}
                  </td>
                  <td className="text-center font-semibold" style={{ color: '#34d399' }}>
                    {run.passed_tests}
                  </td>
                  <td className="text-center font-semibold" style={{ color: run.failed_tests > 0 ? '#f43f5e' : 'var(--c-t5)' }}>
                    {run.failed_tests}
                  </td>

                  <td><StatusBadge status={run.status} /></td>

                  <td className="text-xs font-mono" style={{ color: 'var(--c-t5)' }}>
                    {formatDate(run.started_at)}
                  </td>
                  <td className="text-xs font-mono" style={{ color: 'var(--c-t5)' }}>
                    {formatDuration(run.started_at, run.completed_at)}
                  </td>

                  <td className="text-center">
                    <Link
                      to={`/runs/${run.run_id}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150"
                      title="View details"
                      style={{
                        background: 'rgba(79,70,229,0.08)',
                        border:     '1px solid rgba(99,102,241,0.2)',
                        color:      '#4f46e5',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#818cf8';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(99,102,241,0.3)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = '#4f46e5';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
