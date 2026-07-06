'use client';

import { Plus, X } from 'lucide-react';
import type { ExperimentResults, MetricRow } from '@/lib/types';
import { rate, lift, twoProportionZTest, significanceLabel, formatPct, formatLift } from '@/lib/stats';

interface Props {
  results: ExperimentResults;
  onChange: (results: ExperimentResults) => void;
}

const METRIC_PRESETS = ['add_to_cart', 'checkout', 'purchase', 'revenue', 'aov', 'bounce'];

function parseNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function SigBadge({ p }: { p: number }) {
  const sig = significanceLabel(p);
  const styles = {
    'significant': 'bg-green-500/15 text-green-600 dark:text-green-400',
    'trending': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'not-significant': 'bg-slate-500/10 text-slate-500 dark:text-white/40',
  }[sig];
  const label = { 'significant': 'sig', 'trending': 'trend', 'not-significant': 'n.s.' }[sig];
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${styles}`} title={`p = ${p.toFixed(4)}`}>
      p={p < 0.001 ? '<.001' : p.toFixed(3)} {label}
    </span>
  );
}

export function ResultsPanel({ results, onChange }: Props) {
  const { exposure_event, variants, exposures, metrics, notes } = results;

  function set(patch: Partial<ExperimentResults>) {
    onChange({ ...results, ...patch });
  }

  // --- variants ---
  function renameVariant(idx: number, name: string) {
    set({ variants: variants.map((v, i) => (i === idx ? name : v)) });
  }

  function addVariant() {
    const letter = String.fromCharCode(65 + variants.length); // C, D, …
    set({
      variants: [...variants, `Variant ${letter}`],
      exposures: [...exposures, null],
      metrics: metrics.map((m) => ({ ...m, values: [...m.values, null] })),
    });
  }

  function removeVariant(idx: number) {
    if (idx === 0 || variants.length <= 2) return; // keep control + at least one variant
    set({
      variants: variants.filter((_, i) => i !== idx),
      exposures: exposures.filter((_, i) => i !== idx),
      metrics: metrics.map((m) => ({ ...m, values: m.values.filter((_, i) => i !== idx) })),
    });
  }

  // --- metrics ---
  function addMetric(name = '') {
    if (name && metrics.some((m) => m.name === name)) return;
    set({ metrics: [...metrics, { name, kind: 'count', values: variants.map(() => null) }] });
  }

  function updateMetric(idx: number, patch: Partial<MetricRow>) {
    set({ metrics: metrics.map((m, i) => (i === idx ? { ...m, ...patch } : m)) });
  }

  function removeMetric(idx: number) {
    set({ metrics: metrics.filter((_, i) => i !== idx) });
  }

  function setMetricValue(mIdx: number, vIdx: number, val: string) {
    const m = metrics[mIdx];
    updateMetric(mIdx, { values: m.values.map((v, i) => (i === vIdx ? parseNum(val) : v)) });
  }

  function setExposure(vIdx: number, val: string) {
    set({ exposures: exposures.map((e, i) => (i === vIdx ? parseNum(val) : e)) });
  }

  /** Computed stats for one metric cell vs control. */
  function cellStats(m: MetricRow, vIdx: number) {
    if (vIdx === 0) {
      return { rate: m.kind === 'count' ? rate(m.values[0], exposures[0]) : null, lift: null, z: null };
    }
    if (m.kind === 'count') {
      const r0 = rate(m.values[0], exposures[0]);
      const rv = rate(m.values[vIdx], exposures[vIdx]);
      return {
        rate: rv,
        lift: lift(r0, rv),
        z: twoProportionZTest(m.values[0], exposures[0], m.values[vIdx], exposures[vIdx]),
      };
    }
    return { rate: null, lift: lift(m.values[0], m.values[vIdx]), z: null };
  }

  return (
    <div className="space-y-5">
      {/* Matrix */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10">
              <th className="text-left px-3 py-2 w-52">
                <span className="label">Metric</span>
              </th>
              {variants.map((v, i) => (
                <th key={i} className="px-3 py-2 min-w-[130px]">
                  <div className="flex items-center gap-1">
                    <input
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-white/90 focus:outline-none border-b border-transparent focus:border-violet-400"
                      value={v}
                      onChange={(e) => renameVariant(i, e.target.value)}
                    />
                    {i === 0 && <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/30 shrink-0">ctrl</span>}
                    {i > 0 && variants.length > 2 && (
                      <button type="button" onClick={() => removeVariant(i)} className="text-slate-300 dark:text-white/20 hover:text-red-500 shrink-0" title="Remove variant">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-2 py-2 w-10">
                <button type="button" onClick={addVariant} className="p-1 rounded text-slate-400 dark:text-white/30 hover:text-violet-500 hover:bg-violet-500/10" title="Add variant">
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Exposure row */}
            <tr className="border-b border-slate-200 dark:border-white/10 bg-violet-50/50 dark:bg-violet-500/[0.04]">
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-violet-500/80 shrink-0">exposure</span>
                  <input
                    className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-white/80 placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none border-b border-transparent focus:border-violet-400"
                    placeholder="e.g. pdp_view"
                    value={exposure_event}
                    onChange={(e) => set({ exposure_event: e.target.value })}
                  />
                </div>
              </td>
              {variants.map((_, i) => (
                <td key={i} className="px-3 py-2">
                  <input
                    type="number"
                    className="input !py-1 !px-2 text-right tabular-nums"
                    placeholder="participants"
                    value={exposures[i] ?? ''}
                    onChange={(e) => setExposure(i, e.target.value)}
                  />
                </td>
              ))}
              <td />
            </tr>

            {/* Metric rows */}
            {metrics.map((m, mIdx) => (
              <tr key={mIdx} className="border-b border-slate-100 dark:border-white/5 last:border-0 align-top">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateMetric(mIdx, { kind: m.kind === 'count' ? 'value' : 'count' })}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 transition-colors ${
                        m.kind === 'count'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                      }`}
                      title={m.kind === 'count' ? 'Count metric: rate vs exposures + z-test. Click to switch to raw value.' : 'Value metric: raw number, lift only. Click to switch to count.'}
                    >
                      {m.kind}
                    </button>
                    <input
                      className="w-full bg-transparent text-sm font-medium text-slate-800 dark:text-white/80 placeholder:text-slate-300 dark:placeholder:text-white/20 focus:outline-none border-b border-transparent focus:border-violet-400"
                      placeholder="metric name"
                      value={m.name}
                      onChange={(e) => updateMetric(mIdx, { name: e.target.value })}
                    />
                    <button type="button" onClick={() => removeMetric(mIdx)} className="text-slate-300 dark:text-white/20 hover:text-red-500 shrink-0" title="Remove metric">
                      <X size={12} />
                    </button>
                  </div>
                </td>
                {variants.map((_, vIdx) => {
                  const s = cellStats(m, vIdx);
                  return (
                    <td key={vIdx} className="px-3 py-2">
                      <input
                        type="number"
                        className="input !py-1 !px-2 text-right tabular-nums"
                        value={m.values[vIdx] ?? ''}
                        onChange={(e) => setMetricValue(mIdx, vIdx, e.target.value)}
                      />
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 text-xs tabular-nums min-h-[18px]">
                        {m.kind === 'count' && s.rate != null && (
                          <span className="text-slate-500 dark:text-white/45">{formatPct(s.rate)}</span>
                        )}
                        {vIdx > 0 && s.lift != null && (
                          <span className={`font-semibold ${s.lift >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {formatLift(s.lift)}
                          </span>
                        )}
                        {vIdx > 0 && s.z != null && <SigBadge p={s.z.pValue} />}
                      </div>
                    </td>
                  );
                })}
                <td />
              </tr>
            ))}

            {metrics.length === 0 && (
              <tr>
                <td colSpan={variants.length + 2} className="px-3 py-4 text-center text-xs text-slate-400 dark:text-white/30">
                  No success metrics yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add metric + presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => addMetric()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
        >
          <Plus size={12} /> Add metric
        </button>
        <span className="text-xs text-slate-400 dark:text-white/25 mx-1">presets:</span>
        {METRIC_PRESETS.filter((p) => !metrics.some((m) => m.name === p)).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => addMetric(p)}
            className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/45 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 border border-slate-200 dark:border-white/10 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="label">Result Notes</label>
        <textarea
          className="input min-h-[70px] resize-none"
          placeholder="Interpretation, caveats, links to GrowthBook analysis…"
          value={notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
