'use client';

import { useState, useMemo } from 'react';
import { Trophy, Timer, FlaskConical, Radio, Banknote } from 'lucide-react';
import type { Experiment } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/types';

interface Props {
  experiments: Experiment[];
}

type Range = 'all' | '30d' | '90d';

const outcomeColors: Record<string, string> = {
  Winner: 'bg-green-500',
  Loser: 'bg-red-500',
  Inconclusive: 'bg-yellow-500',
  Stopped: 'bg-slate-400',
  'In Progress': 'bg-blue-500',
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function ReportsTab({ experiments }: Props) {
  const [range, setRange] = useState<Range>('all');
  // Snapshot once per mount — Date.now() during render trips the compiler's purity rule.
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    if (range === 'all') return experiments;
    const days = range === '30d' ? 30 : 90;
    const cutoff = now - days * 86_400_000;
    return experiments.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [experiments, range, now]);

  const stats = useMemo(() => {
    const decided = filtered.filter((e) => ['Winner', 'Loser', 'Inconclusive'].includes(e.result));
    const winners = filtered.filter((e) => e.result === 'Winner');
    const durations = filtered
      .filter((e) => e.start_date && e.end_date)
      .map((e) => (new Date(e.end_date!).getTime() - new Date(e.start_date!).getTime()) / 86_400_000)
      .filter((d) => d >= 0);

    // Stage funnel: for each stage, how many experiments have passed through it
    // and the median days spent in it (from stage_history).
    const funnel = PIPELINE_STAGES.map((stage) => {
      const durationsInStage: number[] = [];
      let touched = 0;
      let current = 0;
      for (const exp of filtered) {
        const hist = exp.stage_history ?? [];
        hist.forEach((entry, i) => {
          if (entry.stage !== stage) return;
          touched++;
          const leftAt = i < hist.length - 1 ? new Date(hist[i + 1].entered_at).getTime() : now;
          durationsInStage.push((leftAt - new Date(entry.entered_at).getTime()) / 86_400_000);
          if (i === hist.length - 1) current++;
        });
      }
      return { stage, touched, current, medianDays: median(durationsInStage) };
    });

    // Outcome split
    const outcomes = ['Winner', 'Loser', 'Inconclusive', 'Stopped', 'In Progress'].map((r) => ({
      result: r,
      count: filtered.filter((e) => e.result === r).length,
    }));

    // Per page / platform
    const byKey = (getKeys: (e: Experiment) => string[]) => {
      const map = new Map<string, number>();
      for (const e of filtered) for (const k of getKeys(e)) map.set(k, (map.get(k) ?? 0) + 1);
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    };

    // Monthly velocity, last 6 months
    const months: { key: string; label: string; created: number; completed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }), created: 0, completed: 0 });
    }
    for (const e of filtered) {
      const ck = e.created_at?.slice(0, 7);
      const m = months.find((m) => m.key === ck);
      if (m) m.created++;
      if (e.status === 'Completed') {
        const doneEntry = (e.stage_history ?? []).find((h) => h.stage === 'Completed');
        const dk = (doneEntry?.entered_at ?? e.end_date ?? '').slice(0, 7);
        const dm = months.find((m) => m.key === dk);
        if (dm) dm.completed++;
      }
    }

    return {
      total: filtered.length,
      live: filtered.filter((e) => e.status === 'Live' || e.status === 'Monitoring' || e.status === 'Results Setup').length,
      winRate: decided.length > 0 ? winners.length / decided.length : null,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      revenueImpacts: filtered.filter((e) => e.revenue_impact).map((e) => ({ id: e.test_id, title: e.title, impact: e.revenue_impact! })),
      funnel,
      outcomes,
      byPage: byKey((e) => e.pages),
      byPlatform: byKey((e) => e.platform),
      months,
    };
  }, [filtered, now]);

  const maxFunnel = Math.max(1, ...stats.funnel.map((f) => f.touched));
  const maxMonthly = Math.max(1, ...stats.months.map((m) => Math.max(m.created, m.completed)));
  const decidedTotal = stats.outcomes.reduce((a, o) => a + o.count, 0);

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex items-center gap-1">
        {(['all', '30d', '90d'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === r
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {r === 'all' ? 'All time' : `Last ${r}`}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<FlaskConical size={16} />} label="Total Tests" value={String(stats.total)} />
        <SummaryCard icon={<Radio size={16} />} label="Live Now" value={String(stats.live)} accent="text-blue-500" />
        <SummaryCard icon={<Trophy size={16} />} label="Win Rate" value={stats.winRate != null ? `${Math.round(stats.winRate * 100)}%` : '—'} accent="text-green-500" sub="of decided tests" />
        <SummaryCard icon={<Timer size={16} />} label="Avg Duration" value={stats.avgDuration != null ? `${Math.round(stats.avgDuration)}d` : '—'} sub="start → end" />
      </div>

      {/* Outcome split */}
      <Section title="Outcomes">
        {decidedTotal > 0 ? (
          <>
            <div className="flex h-3 rounded-full overflow-hidden">
              {stats.outcomes.filter((o) => o.count > 0).map((o) => (
                <div
                  key={o.result}
                  className={outcomeColors[o.result]}
                  style={{ width: `${(o.count / decidedTotal) * 100}%` }}
                  title={`${o.result}: ${o.count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {stats.outcomes.map((o) => (
                <span key={o.result} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/45">
                  <span className={`w-2 h-2 rounded-full ${outcomeColors[o.result]}`} />
                  {o.result} <b className="text-slate-800 dark:text-white/80 tabular-nums">{o.count}</b>
                </span>
              ))}
            </div>
          </>
        ) : <Empty />}
      </Section>

      {/* Stage funnel */}
      <Section title="Pipeline Funnel" sub="tests through each stage · median days in stage (⚠ = bottleneck candidates)">
        <div className="space-y-1.5">
          {stats.funnel.map((f) => {
            const slow = f.medianDays != null && f.medianDays >= 7 && f.stage !== 'Completed';
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-slate-500 dark:text-white/45 text-right">{f.stage}</span>
                <div className="flex-1 h-5 rounded bg-slate-100 dark:bg-white/[0.04] overflow-hidden relative">
                  <div
                    className="h-full rounded bg-gradient-to-r from-violet-500/70 to-blue-500/70"
                    style={{ width: `${(f.touched / maxFunnel) * 100}%` }}
                  />
                  {f.current > 0 && (
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white drop-shadow">
                      {f.current} here now
                    </span>
                  )}
                </div>
                <span className="w-10 shrink-0 text-xs tabular-nums text-slate-700 dark:text-white/70 font-semibold">{f.touched}</span>
                <span className={`w-20 shrink-0 text-xs tabular-nums ${slow ? 'text-amber-500 font-semibold' : 'text-slate-400 dark:text-white/30'}`}>
                  {f.medianDays != null ? `~${f.medianDays < 1 ? '<1' : Math.round(f.medianDays)}d${slow ? ' ⚠' : ''}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By page */}
        <Section title="Tests per Page">
          {stats.byPage.length > 0 ? (
            <BarList items={stats.byPage} color="bg-violet-500/60" />
          ) : <Empty />}
        </Section>

        {/* By platform */}
        <Section title="Tests per Platform">
          {stats.byPlatform.length > 0 ? (
            <BarList items={stats.byPlatform} color="bg-blue-500/60" />
          ) : <Empty />}
        </Section>
      </div>

      {/* Monthly velocity */}
      <Section title="Monthly Velocity" sub="created vs completed">
        <div className="flex items-end gap-4 h-32 pt-2">
          {stats.months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full">
              <div className="flex-1 w-full flex items-end justify-center gap-1.5">
                <div
                  className="w-5 rounded-t bg-violet-500/70"
                  style={{ height: `${(m.created / maxMonthly) * 100}%` }}
                  title={`Created: ${m.created}`}
                />
                <div
                  className="w-5 rounded-t bg-green-500/70"
                  style={{ height: `${(m.completed / maxMonthly) * 100}%` }}
                  title={`Completed: ${m.completed}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-white/30">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/45">
            <span className="w-2 h-2 rounded-sm bg-violet-500/70" /> Created
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/45">
            <span className="w-2 h-2 rounded-sm bg-green-500/70" /> Completed
          </span>
        </div>
      </Section>

      {/* Revenue impact */}
      <Section title="Revenue Impact" sub="as recorded per test">
        {stats.revenueImpacts.length > 0 ? (
          <div className="space-y-1.5">
            {stats.revenueImpacts.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <Banknote size={14} className="text-green-500 shrink-0" />
                <span className="font-mono text-xs text-slate-400 dark:text-white/35 shrink-0">{r.id}</span>
                <span className="flex-1 truncate text-slate-700 dark:text-white/70">{r.title}</span>
                <span className="font-semibold text-green-600 dark:text-green-400 shrink-0">{r.impact}</span>
              </div>
            ))}
          </div>
        ) : <Empty />}
      </Section>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-slate-400 dark:text-white/35 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent ?? 'text-slate-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white/90">{title}</h3>
        {sub && <p className="text-xs text-slate-400 dark:text-white/30 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function BarList({ items, color }: { items: [string, number][]; color: string }) {
  const max = Math.max(1, ...items.map(([, n]) => n));
  return (
    <div className="space-y-1.5">
      {items.map(([label, n]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-xs text-slate-500 dark:text-white/45 text-right truncate" title={label}>{label}</span>
          <div className="flex-1 h-4 rounded bg-slate-100 dark:bg-white/[0.04] overflow-hidden">
            <div className={`h-full rounded ${color}`} style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="w-8 shrink-0 text-xs tabular-nums text-slate-700 dark:text-white/70 font-semibold">{n}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-slate-400 dark:text-white/25">No data in range.</p>;
}
