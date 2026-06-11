import React from 'react';
import { CheckCircle2, XCircle, Loader2, StopCircle, Clock } from 'lucide-react';

type Status = 'passed' | 'failed' | 'in_progress' | 'stopped' | 'never_run' | string;

interface Props { status: Status; }

const CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  passed:      { label: 'Pass',        icon: CheckCircle2, className: 'status-pass' },
  failed:      { label: 'Fail',        icon: XCircle,      className: 'status-fail' },
  in_progress: { label: 'In Progress', icon: Loader2,       className: 'status-in-progress' },
  stopped:     { label: 'Stopped',     icon: StopCircle,   className: 'status-stopped' },
  never_run:   { label: 'Not Run',     icon: Clock,        className: 'status-never' },
};

export default function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? CONFIG['never_run'];
  const Icon = cfg.icon;
  return (
    <span className={cfg.className}>
      <Icon className={`w-3 h-3 flex-shrink-0 ${status === 'in_progress' ? 'animate-spin-slow' : ''}`} />
      {cfg.label}
    </span>
  );
}
