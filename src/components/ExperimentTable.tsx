'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { Experiment, MetricRow } from '@/lib/types';
import { PipelineBar } from './PipelineBar';
import { rate, lift, twoProportionZTest, significanceLabel, formatPct, formatLift } from '@/lib/stats';

interface Props {
  experiments: Experiment[];
  onEdit: (exp: Experiment) => void;
  onDelete: (id: number) => void;
}

const resultColors: Record<string, string> = {
  'In Progress': 'text-blue-400 bg-blue-400/10',
  'Winner': 'text-green-400 bg-green-400/10',
  'Loser': 'text-red-400 bg-red-400/10',
  'Inconclusive': 'text-yellow-400 bg-yellow-400/10',
  'Stopped': 'text-slate-400 bg-slate-400/10',
};

function ExpandedRow({ exp }: { exp: Experiment }) {
  // Snapshot once per mount — Date.now() during render trips the compiler's purity rule.
  const [now] = useState(() => Date.now());
  return (
    <div className="px-6 py-5 bg-white/[0.02] border-t border-white/5 space-y-4">
      <PipelineBar status={exp.status} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <InfoBlock label="Creator" value={exp.creator || '—'} />
        <InfoBlock label="GrowthBook ID" value={exp.growthbook_id || '—'} />
        <InfoBlock label="Amaly Task ID" value={exp.amaly_task_id || '—'} />
        <InfoBlock label="Revenue Impact" value={exp.revenue_impact || '—'} />
        <InfoBlock label="Start Date" value={exp.start_date || '—'} />
        <InfoBlock label="End Date" value={exp.end_date || '—'} />
        <InfoBlock label="Source" value={exp.source} />
        <InfoBlock label="Created" value={new Date(exp.created_at).toLocaleDateString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Hypothesis</p>
          <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed">{exp.hypothesis || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Problem Statement</p>
          <p className="text-sm text-slate-700 dark:text-white/80 leading-relaxed">{exp.problem_statement || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Primary Metric</p>
          <p className="text-sm text-slate-700 dark:text-white/80">{exp.metrics.primary || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Secondary Metrics</p>
          <p className="text-sm text-slate-700 dark:text-white/80">{exp.metrics.secondary.join(', ') || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Guardrail Metrics</p>
          <p className="text-sm text-slate-700 dark:text-white/80">{exp.metrics.guardrail.join(', ') || '—'}</p>
        </div>
      </div>

      {/* Stage timeline mini-view */}
      {(exp.stage_history?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-2">Stage History</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {exp.stage_history.map((h, i) => {
              const isLast = i === exp.stage_history.length - 1;
              const leftAt = isLast ? now : new Date(exp.stage_history[i + 1].entered_at).getTime();
              const days = Math.floor((leftAt - new Date(h.entered_at).getTime()) / 86_400_000);
              return (
                <span key={i} className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      isLast
                        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/45'
                    }`}
                    title={`${new Date(h.entered_at).toLocaleDateString()}${h.note ? ` — ${h.note}` : ''}`}
                  >
                    {h.stage} <span className="opacity-60 tabular-nums">{days}d</span>
                  </span>
                  {!isLast && <span className="text-slate-300 dark:text-white/20 text-[10px]">→</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Results summary */}
      {exp.results && exp.results.metrics.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-2">
            Results{exp.results.exposure_event && <> · exposure: <span className="font-mono">{exp.results.exposure_event}</span></>}
          </p>
          <div className="space-y-1">
            {exp.results.metrics.map((m, i) => (
              <MetricSummary key={i} metric={m} results={exp.results} />
            ))}
          </div>
        </div>
      )}
      {exp.results?.notes && (
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Result Notes</p>
          <p className="text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap">{exp.results.notes}</p>
        </div>
      )}

      {exp.remarks && (
        <div>
          <p className="text-xs text-slate-500 dark:text-white/40 mb-1">Remarks</p>
          <p className="text-sm text-slate-700 dark:text-white/80">{exp.remarks}</p>
        </div>
      )}
    </div>
  );
}

function MetricSummary({ metric, results }: { metric: MetricRow; results: NonNullable<Experiment['results']> }) {
  const { exposures } = results;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="font-mono font-semibold text-slate-700 dark:text-white/70 w-28 truncate" title={metric.name}>{metric.name || '(unnamed)'}</span>
      {results.variants.map((v, i) => {
        const val = metric.values[i];
        const r = metric.kind === 'count' ? rate(val, exposures[i]) : null;
        const l = i > 0
          ? (metric.kind === 'count'
              ? lift(rate(metric.values[0], exposures[0]), r)
              : lift(metric.values[0], val))
          : null;
        const z = i > 0 && metric.kind === 'count'
          ? twoProportionZTest(metric.values[0], exposures[0], val, exposures[i])
          : null;
        return (
          <span key={i} className="flex items-center gap-1 text-slate-500 dark:text-white/45">
            <span className="text-slate-400 dark:text-white/30">{v}:</span>
            <span className="tabular-nums text-slate-700 dark:text-white/70">
              {metric.kind === 'count' ? (r != null ? formatPct(r) : val ?? '—') : val ?? '—'}
            </span>
            {l != null && (
              <span className={`font-semibold tabular-nums ${l >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {formatLift(l)}
              </span>
            )}
            {z != null && (
              <span className={`tabular-nums ${significanceLabel(z.pValue) === 'significant' ? 'text-green-600 dark:text-green-400 font-semibold' : significanceLabel(z.pValue) === 'trending' ? 'text-amber-500' : 'text-slate-400 dark:text-white/30'}`}>
                p={z.pValue < 0.001 ? '<.001' : z.pValue.toFixed(3)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-white/40">{label}</p>
      <p className="text-sm text-slate-700 dark:text-white/80 mt-0.5">{value}</p>
    </div>
  );
}

export function ExperimentTable({ experiments, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (experiments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-white/30">
        <div className="text-5xl mb-4">🧪</div>
        <p className="text-lg font-medium">No experiments yet</p>
        <p className="text-sm mt-1">Click &quot;New Experiment&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header removed, now using stacked cards */}
      <div className="flex flex-col gap-3">
        {experiments.map((exp) => {
          const isExpanded = expanded.has(exp.id);
          return (
            <div key={exp.id} className="group rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:bg-white/[0.04] transition-colors shadow-sm dark:shadow-none overflow-hidden">
              {/* Main Card Header */}
              <div
                className="flex flex-wrap md:flex-nowrap items-start gap-4 px-5 py-4 cursor-pointer"
                onClick={() => toggleRow(exp.id)}
              >
                {/* ID & Expand */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <div className="text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/60 transition-colors">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                    {exp.test_id}
                  </div>
                </div>

                {/* Title and Hypothesis */}
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1 leading-snug">{exp.title}</p>
                  {exp.hypothesis && (
                    <p className="text-xs text-slate-500 dark:text-white/40 line-clamp-2 leading-relaxed">{exp.hypothesis}</p>
                  )}
                </div>

                {/* Badges & Status */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0 mt-2 md:mt-0">
                  <div className="w-[180px]" onClick={(e) => e.stopPropagation()}>
                    <PipelineBar status={exp.status} compact />
                  </div>

                  <div className="flex flex-col gap-1.5 w-[140px]">
                    <div className="flex flex-wrap gap-1">
                      {exp.platform.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/10">
                          {p.replace('Web-', 'W-').replace('App-', 'A-')}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {exp.pages.slice(0, 2).map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                          {p}
                        </span>
                      ))}
                      {exp.pages.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 dark:text-white/30">+{exp.pages.length - 2}</span>
                      )}
                    </div>
                  </div>

                  <div className="w-[100px]">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${resultColors[exp.result] ?? 'text-slate-500 dark:text-white/50'}`}>
                      {exp.result}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(exp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this experiment?')) onDelete(exp.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && <ExpandedRow exp={exp} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
