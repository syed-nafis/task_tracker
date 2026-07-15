'use client';

import { useState } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import type { StageEntry } from '@/lib/types';

interface Props {
  history: StageEntry[];
  onChange: (history: StageEntry[]) => void;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function formatDuration(days: number): string {
  if (days < 1) return '<1d';
  return `${Math.round(days)}d`;
}

export function StageHistory({ history, onChange }: Props) {
  // Snapshot once per mount — impure date calls during render trip the compiler's purity rule.
  const [now] = useState(() => new Date().toISOString());
  if (history.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-white/30">No stage history yet.</p>;
  }

  function setNote(idx: number, note: string) {
    onChange(history.map((e, i) => (i === idx ? { ...e, note } : e)));
  }

  return (
    <div className="space-y-0">
      {history.map((entry, i) => {
        const isCurrent = i === history.length - 1;
        const leftAt = isCurrent ? now : history[i + 1].entered_at;
        const duration = formatDuration(daysBetween(entry.entered_at, leftAt));
        return (
          <div key={`${entry.stage}-${entry.entered_at}`} className="flex gap-3">
            {/* Timeline gutter */}
            <div className="flex flex-col items-center">
              {isCurrent
                ? <Circle size={16} className="text-violet-500 fill-violet-500/30 shrink-0 mt-1" />
                : <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-1" />}
              {!isCurrent && <div className="w-px flex-1 bg-slate-200 dark:bg-white/10 my-1" />}
            </div>

            {/* Entry */}
            <div className={`flex-1 min-w-0 ${isCurrent ? '' : 'pb-4'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm font-semibold ${isCurrent ? 'text-violet-600 dark:text-violet-400' : 'text-slate-800 dark:text-white/80'}`}>
                  {entry.stage}
                  {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-violet-500/80">current</span>}
                </span>
                <span className="text-xs text-slate-400 dark:text-white/35 tabular-nums shrink-0">
                  {new Date(entry.entered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' · '}{duration}{isCurrent ? ' so far' : ''}
                </span>
              </div>
              <input
                className="mt-1 w-full bg-transparent text-xs text-slate-600 dark:text-white/50 placeholder:text-slate-300 dark:placeholder:text-white/20 border-b border-transparent focus:border-slate-300 dark:focus:border-white/20 focus:outline-none pb-0.5"
                placeholder="Add stage note…"
                value={entry.note}
                onChange={(e) => setNote(i, e.target.value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
