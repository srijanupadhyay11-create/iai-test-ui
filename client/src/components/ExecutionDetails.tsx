import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Activity, Clock, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { RunDetail } from '../types';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function OutputPane({ output }: { output: string }) {
  const [open, setOpen] = useState(false);
  if (!output?.trim()) return <span className="text-xs" style={{ color: 'var(--c-t6)' }}>no output</span>;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs transition-all duration-150"
        style={{ color: 'var(--c-t5)' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--c-t5)')}
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {open ? 'Hide' : 'Show'} output
      </button>
      {open && (
        <pre className="mt-2 terminal max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
          {output}
        </pre>
      )}
    </div>
  );
}

const STAT_CONFIGS = [
  {
    key: 'total',
    label: 'Total Tests',
    color: '#94a3b8',
    bg:    'rgba(99,102,241,0.07)',
    bd:    'rgba(99,102,241,0.18)',
  },
  {
    key: 'passed',
    label: 'Passed',
    color: '#34d399',
    bg:    'rgba(52,211,153,0.07)',
    bd:    'rgba(52,211,153,0.2)',
  },
  {
    key: 'failed',
    label: 'Failed',
    color: '#f43f5e',
    bg:    'rgba(244,63,94,0.07)',
    bd:    'rgba(244,63,94,0.2)',
  },
  {
    key: 'status',
    label: 'Status',
    color: '#818cf8',
    bg:    'rgba(99,102,241,0.07)',
    bd:    'rgba(99,102,241,0.18)',
  },
];

export default function ExecutionDetails() {
  const { runId }  = useParams<{ runId: string }>();
  const [detail,   setDetail]  = useState<RunDetail | null>(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    api.runs.get(runId)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3" style={{ color: 'var(--c-t3)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#818cf8' }} />
        <span className="text-sm">Loading run details…</span>
      </div>
    </div>
  );

  if (error || !detail) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm" style={{ color: '#f43f5e' }}>{error || 'Run not found'}</p>
    </div>
  );

  const { run, results } = detail;
  const stats = [
    { ...STAT_CONFIGS[0], value: run.total_tests },
    { ...STAT_CONFIGS[1], value: run.passed_tests },
    { ...STAT_CONFIGS[2], value: run.failed_tests },
    { ...STAT_CONFIGS[3], value: run.status.replace('_', ' ').toUpperCase() },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/tests"
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
          style={{ color: 'var(--c-t4)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#818cf8';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--c-t4)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-bd0)';
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--c-t1)' }}>
            Run{' '}
            <span className="font-mono" style={{ color: '#818cf8' }}>#{run.run_id}</span>
          </h2>
          <p className="text-xs" style={{ color: 'var(--c-t5)' }}>
            Started {formatDate(run.started_at)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={run.status} />
          <span
            className="text-xs px-2.5 py-1 rounded-lg font-mono"
            style={{ color: 'var(--c-t3)', background: 'var(--c-surface)', border: '1px solid var(--c-bd0)' }}
          >
            {run.mode === 'parallel' ? `Parallel · ${run.workers}w` : 'Serial'}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center transition-all duration-200"
            style={{ background: stat.bg, border: `1px solid ${stat.bd}` }}
          >
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--c-t3)' }}>
              {stat.label}
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}40` }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* HTML report link */}
      <div>
        <a
          href={`/playwright-reports/${run.run_id}/index.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{
            color:      '#818cf8',
            background: 'rgba(79,70,229,0.08)',
            border:     '1px solid rgba(99,102,241,0.2)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(99,102,241,0.3)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)';
          }}
        >
          <FileText className="w-3.5 h-3.5" />
          Full HTML Report for this run
        </a>
      </div>

      {/* Results table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--c-table)', border: '1px solid var(--c-bd0)' }}
      >
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>File</th>
              <th className="w-28">Status</th>
              <th className="w-24">Duration</th>
              <th className="w-20">Trace</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => {
              const traceViewerUrl = r.trace_path
                ? `https://trace.playwright.dev/?trace=${window.location.origin}/test-results/${encodeURIComponent(r.trace_path)}`
                : null;
              return (
                <tr key={r.id} className="align-top">
                  <td>
                    <div className="font-medium text-sm" style={{ color: 'var(--c-t2)' }}>{r.name}</div>
                    {r.describe_block && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--c-t5)' }}>{r.describe_block}</div>
                    )}
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'var(--c-t5)' }}>{r.file_path}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--c-t5)' }}>
                      <Clock className="w-3 h-3" />
                      {formatDuration(r.duration)}
                    </span>
                  </td>
                  <td>
                    {traceViewerUrl ? (
                      <a
                        href={traceViewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs transition-colors duration-150"
                        style={{ color: '#4f46e5' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#818cf8')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#4f46e5')}
                      >
                        <Activity className="w-3 h-3" /> View
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--c-t6)' }}>—</span>
                    )}
                  </td>
                  <td><OutputPane output={r.output} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {results.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--c-t5)' }}>
            No results recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
