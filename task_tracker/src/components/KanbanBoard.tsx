'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Experiment, ExperimentStatus } from '@/lib/types';
import { PIPELINE_STAGES, PHASES } from '@/lib/types';

interface Props {
  experiments: Experiment[];
  onOpen: (exp: Experiment) => void;
  onStageChange: (exp: Experiment, status: ExperimentStatus) => void;
}

// Per-phase header tint — bg + text, light/dark aware
const phaseHeader: Record<string, string> = {
  'Planning': 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  'Setup': 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  'Build': 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  'QA': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  'Code Review': 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  'Live': 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
  'Done': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // Track how far the board can scroll so the slider can mirror it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setMaxScroll(Math.max(0, el.scrollWidth - el.clientWidth));
      setScrollLeft(el.scrollLeft);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [experiments]);

  // Drag-to-pan with the mouse; a real drag (>4px) swallows the click so cards don't open.
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    let moved = false;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        setDragging(true);
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragging(false);
      if (moved) {
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 0);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function move(exp: Experiment, dir: -1 | 1) {
    const idx = PIPELINE_STAGES.indexOf(exp.status);
    const next = PIPELINE_STAGES[idx + dir];
    if (next) onStageChange(exp, next);
  }

  return (
    <div>
    <div
      ref={scrollRef}
      onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
      onMouseDown={onMouseDown}
      onClickCapture={(e) => {
        if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); }
      }}
      className={`grid grid-flow-col auto-cols-[minmax(290px,1fr)] divide-x divide-dotted divide-slate-200 dark:divide-white/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        maxScroll > 1 ? (dragging ? 'cursor-grabbing select-none' : 'cursor-grab') : ''
      }`}
    >
      {PHASES.map((phase) => {
        const cards = experiments.filter((e) => phase.stages.includes(e.status));
        return (
          <div key={phase.name} className="flex flex-col min-w-0">
            {/* Header — color-coded per phase over a dotted rule */}
            <div className={`flex items-baseline gap-2 px-3 py-2 mx-1.5 mt-1 rounded-md border-b border-dotted border-slate-200 dark:border-white/10 ${phaseHeader[phase.name] ?? 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/55'}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider">{phase.name}</span>
              <span className="text-[11px] tabular-nums opacity-60">{cards.length}</span>
            </div>

            {/* Cards — floating on open surface */}
            <div className="flex flex-col gap-2 p-2.5 min-h-[100px]">
              {cards.map((exp) => {
                const stageIdx = PIPELINE_STAGES.indexOf(exp.status);
                const days = daysInStage(exp, now);
                const stale = days != null && days >= 7 && exp.status !== 'Completed';
                return (
                  <div
                    key={exp.id}
                    onClick={() => onOpen(exp)}
                    className="group rounded-lg bg-white dark:bg-white/[0.05] shadow-sm shadow-slate-200/80 dark:shadow-black/40 hover:shadow-md dark:hover:bg-white/[0.07] px-2.5 py-2 cursor-pointer transition-all"
                  >
                    {/* Title */}
                    <p className="text-[13px] text-slate-800 dark:text-white/90 leading-snug line-clamp-2">{exp.title}</p>

                    {/* Stage chip — only when phase has multiple stages */}
                    {phase.stages.length > 1 && (
                      <span className="inline-block mt-1.5 px-1.5 py-px rounded-sm text-[10px] font-medium bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-white/45">
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
            </div>
          </div>
        );
      })}
    </div>

    {/* Slider — mirrors horizontal scroll; only shown when the board overflows */}
    {maxScroll > 1 && (
      <input
        type="range"
        aria-label="Scroll board horizontally"
        min={0}
        max={maxScroll}
        value={Math.min(scrollLeft, maxScroll)}
        onChange={(e) => {
          const el = scrollRef.current;
          if (el) el.scrollLeft = Number(e.target.value);
        }}
        className="w-full mt-3 h-1.5 cursor-pointer accent-violet-500"
      />
    )}
    </div>
  );
}
