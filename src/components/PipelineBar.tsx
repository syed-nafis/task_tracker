'use client';

import { PIPELINE_STAGES, ExperimentStatus } from '@/lib/types';

interface PipelineBarProps {
  status: ExperimentStatus;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  'Idea': 'bg-slate-400',
  'Analysis': 'bg-blue-400',
  'PRD': 'bg-cyan-400',
  'Growthbook Setup': 'bg-teal-400',
  'Amaly Task': 'bg-emerald-400',
  'Implementation': 'bg-lime-400',
  'Deploy Local': 'bg-yellow-400',
  'SQA': 'bg-orange-400',
  'Code Review': 'bg-amber-400',
  'Merge': 'bg-rose-400',
  'Staging (Club)': 'bg-pink-400',
  'Live': 'bg-fuchsia-400',
  'Results Setup': 'bg-violet-400',
  'Monitoring': 'bg-purple-400',
  'Completed': 'bg-green-400',
};

export function PipelineBar({ status, compact = false }: PipelineBarProps) {
  const currentIdx = PIPELINE_STAGES.indexOf(status);
  const pct = Math.round(((currentIdx + 1) / PIPELINE_STAGES.length) * 100);

  if (compact) {
    const color = statusColors[status] ?? 'bg-slate-400';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-black/80 ${color}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-900 dark:text-white/50">
        <span className="font-medium text-slate-900 dark:text-white/80">{status}</span>
        <span>{pct}%</span>
      </div>
      <div className="flex gap-0.5">
        {PIPELINE_STAGES.map((stage, i) => {
          const done = i <= currentIdx;
          const color = done ? (statusColors[stage] ?? 'bg-slate-400') : 'bg-white/10';
          return (
            <div
              key={stage}
              title={stage}
              className={`h-1.5 flex-1 rounded-full transition-all ${color}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-900 dark:text-white/30">
        <span>Idea</span>
        <span>Completed</span>
      </div>
    </div>
  );
}
