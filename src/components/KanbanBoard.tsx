'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Experiment, ExperimentStatus } from '@/lib/types';
import { PIPELINE_STAGES, PHASES } from '@/lib/types';

interface Props {
  experiments: Experiment[];
  onOpen: (exp: Experiment) => void;
  onStageChange: (exp: Experiment, status: ExperimentStatus) => void;
}

// Per-phase color grading: accent bar under the header + tint used on drop hover.
const phaseAccent: Record<string, { bar: string; text: string; tint: string }> = {
  'Planning':    { bar: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-300',     tint: 'bg-slate-400/[0.07]' },
  'Setup':       { bar: 'bg-violet-500',  text: 'text-violet-600 dark:text-violet-300',   tint: 'bg-violet-500/[0.07]' },
  'Build':       { bar: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-300',       tint: 'bg-blue-500/[0.07]' },
  'QA':          { bar: 'bg-cyan-500',    text: 'text-cyan-600 dark:text-cyan-300',       tint: 'bg-cyan-500/[0.07]' },
  'Code Review': { bar: 'bg-rose-500',    text: 'text-rose-600 dark:text-rose-300',       tint: 'bg-rose-500/[0.07]' },
  'Live':        { bar: 'bg-teal-500',    text: 'text-teal-600 dark:text-teal-300',       tint: 'bg-teal-500/[0.07]' },
  'Done':        { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-300', tint: 'bg-emerald-500/[0.07]' },
};

const resultDot: Record<string, string> = {
  'In Progress': 'bg-blue-500',
  'Winner': 'bg-green-500',
  'Loser': 'bg-red-500',
  'Inconclusive': 'bg-yellow-500',
  'Stopped': 'bg-slate-400',
};

function daysInStage(exp: Experiment, now: number): number | null {
  const last = exp.stage_history?.[exp.stage_history.length - 1];
  if (!last) return null;
  return Math.floor((now - new Date(last.entered_at).getTime()) / 86_400_000);
}

export function KanbanBoard({ experiments, onOpen, onStageChange }: Props) {
  // Snapshot once per mount — Date.now() during render trips the compiler's purity rule.
  const [now] = useState(() => Date.now());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropPhase, setDropPhase] = useState<string | null>(null);

  function move(exp: Experiment, dir: -1 | 1) {
    const idx = PIPELINE_STAGES.indexOf(exp.status);
    const next = PIPELINE_STAGES[idx + dir];
    if (next) onStageChange(exp, next);
  }

  function handleDrop(e: React.DragEvent, stages: ExperimentStatus[]) {
    e.preventDefault();
    setDropPhase(null);
    setDraggingId(null);
    // dataTransfer is the source of truth — state may be stale or cleared.
    const id = Number(e.dataTransfer.getData('text/plain'));
    const exp = experiments.find((x) => x.id === id);
    if (!exp || stages.includes(exp.status)) return;
    // Dropping onto a phase lands the card on that phase's first stage.
    onStageChange(exp, stages[0]);
  }

  return (
    <div className="flex gap-5 overflow-x-auto pb-4 items-start">
      {PHASES.map((phase) => {
        const cards = experiments.filter((e) => phase.stages.includes(e.status));
        const accent = phaseAccent[phase.name] ?? phaseAccent['Planning'];
        const isTarget = dropPhase === phase.name && draggingId != null;
        return (
          <div
            key={phase.name}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={() => setDropPhase(phase.name)}
            onDragLeave={(e) => {
              // Only clear when leaving the column itself, not moving between children.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropPhase(null);
            }}
            onDrop={(e) => handleDrop(e, phase.stages)}
            className={`flex flex-col shrink-0 w-[268px] rounded-xl transition-colors duration-150 ${isTarget ? accent.tint : ''}`}
          >
            {/* Header — name + count over a phase-colored accent bar. No borders. */}
            <div className="px-1 pt-1">
              <div className="flex items-baseline gap-2 pb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${accent.text}`}>{phase.name}</span>
                <span className="text-[11px] font-medium tabular-nums text-slate-400 dark:text-white/30">{cards.length}</span>
              </div>
              <div className={`h-[3px] rounded-full ${accent.bar} opacity-70`} />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 px-1 pt-3 pb-1 min-h-[140px]">
              {cards.map((exp) => {
                const stageIdx = PIPELINE_STAGES.indexOf(exp.status);
                const days = daysInStage(exp, now);
                const stale = days != null && days >= 7 && exp.status !== 'Completed';
                return (
                  <div
                    key={exp.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(exp.id));
                      // Defer the re-render: mutating the dragged node during
                      // dragstart makes Chrome cancel the drag.
                      requestAnimationFrame(() => setDraggingId(exp.id));
                    }}
                    onDragEnd={() => { setDraggingId(null); setDropPhase(null); }}
                    onClick={() => onOpen(exp)}
                    className={`group select-none rounded-lg bg-white dark:bg-white/[0.06] px-3 py-2.5 cursor-grab active:cursor-grabbing shadow-[0_1px_3px_rgba(0,0,0,0.07)] dark:shadow-none hover:shadow-[0_3px_10px_rgba(0,0,0,0.10)] dark:hover:bg-white/[0.09] transition-all ${
                      draggingId === exp.id ? 'opacity-40' : ''
                    }`}
                  >
                    {/* Title */}
                    <p className="text-[13px] text-slate-800 dark:text-white/90 leading-snug line-clamp-2">{exp.title}</p>

                    {/* Stage chip — only when phase has multiple stages */}
                    {phase.stages.length > 1 && (
                      <span className="inline-block mt-1.5 px-1.5 py-px rounded text-[10px] font-medium bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-white/45">
                        {exp.status}
                      </span>
                    )}

                    {/* Footer — key left, meta right */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-white/35">{exp.test_id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] tabular-nums ${stale ? 'text-amber-500 font-semibold' : 'text-slate-400 dark:text-white/30'}`}>
                          {days != null ? `${days}d${stale ? ' ⚠' : ''}` : ''}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${resultDot[exp.result] ?? 'bg-slate-300'}`} title={exp.result} />
                        <div className="hidden group-hover:flex gap-px" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => move(exp, -1)}
                            disabled={stageIdx === 0}
                            className="p-0.5 rounded text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Previous stage"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => move(exp, 1)}
                            disabled={stageIdx === PIPELINE_STAGES.length - 1}
                            className="p-0.5 rounded text-slate-400 dark:text-white/30 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Next stage"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className={`py-8 text-center text-[11px] transition-colors ${
                  isTarget ? `${accent.text} font-medium` : 'text-slate-300 dark:text-white/15'
                }`}>
                  {isTarget ? 'Drop here' : 'No tests'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
