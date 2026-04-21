'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Experiment, Platform, ExperimentStatus, ExperimentResult } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/types';
import { PageSelector } from './PageSelector';
import { PipelineBar } from './PipelineBar';

const PLATFORMS: Platform[] = ['Web-Mobile', 'Web-Desk', 'App-iOS', 'App-Android'];
const RESULTS: ExperimentResult[] = ['In Progress', 'Winner', 'Loser', 'Inconclusive', 'Stopped'];

interface Props {
  onClose: () => void;
  onSave: (exp: Partial<Experiment>) => void;
  initial?: Partial<Experiment>;
  allPages: string[];
  onNewPage: (p: string) => void;
}

export function ExperimentModal({ onClose, onSave, initial, allPages, onNewPage }: Props) {
  const [form, setForm] = useState<Partial<Experiment>>({
    title: '',
    status: 'Idea',
    platform: [],
    pages: [],
    hypothesis: '',
    problem_statement: '',
    metrics: { primary: 'CVR', secondary: [], guardrail: [] },
    result: 'In Progress',
    revenue_impact: null,
    creator: '',
    baseline_data: '',
    current_data: '',
    start_date: initial?.id ? null : new Date().toISOString().split('T')[0],
    end_date: null,
    remarks: '',
    growthbook_id: '',
    amaly_task_id: '',
    ...initial,
  });

  const [metricInput, setMetricInput] = useState({ secondary: '', guardrail: '' });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function set<K extends keyof Experiment>(key: K, val: Experiment[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function togglePlatform(p: Platform) {
    const cur = form.platform ?? [];
    set('platform', cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  }

  function addMetric(field: 'secondary' | 'guardrail') {
    const val = metricInput[field].trim();
    if (!val) return;
    const cur = form.metrics?.[field] as string[] ?? [];
    set('metrics', { ...form.metrics!, [field]: [...cur, val] });
    setMetricInput((m) => ({ ...m, [field]: '' }));
  }

  function removeMetric(field: 'secondary' | 'guardrail', idx: number) {
    const cur = (form.metrics?.[field] as string[]).filter((_, i) => i !== idx);
    set('metrics', { ...form.metrics!, [field]: cur });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial?.id ? 'Edit Experiment' : 'New Experiment'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-900 dark:text-white/60 hover:text-slate-900 dark:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Pipeline preview */}
          <PipelineBar status={form.status ?? 'Idea'} />

          {/* Title */}
          <div className="space-y-1.5">
            <label className="label">Title</label>
            <input className="input" placeholder="Experiment title" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} required />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="label">Pipeline Stage</label>
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as ExperimentStatus)}>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="label">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p} type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    form.platform?.includes(p)
                      ? 'bg-violet-500/30 border-violet-500/60 text-violet-200'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white/50 hover:text-slate-900 dark:text-white hover:border-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div className="space-y-1.5">
            <label className="label">Pages</label>
            <PageSelector
              selected={form.pages ?? []}
              onChange={(pages) => set('pages', pages)}
              allPages={allPages}
              onNewPage={onNewPage}
            />
          </div>

          {/* Two-col grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Creator</label>
              <input className="input" placeholder="Your name" value={form.creator ?? ''} onChange={(e) => set('creator', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Result</label>
              <select className="input" value={form.result} onChange={(e) => set('result', e.target.value as ExperimentResult)}>
                {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date ?? ''} onChange={(e) => set('end_date', e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">GrowthBook ID</label>
              <input className="input" placeholder="gb-xxx" value={form.growthbook_id ?? ''} onChange={(e) => set('growthbook_id', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Amaly Task ID</label>
              <input className="input" placeholder="amaly-xxx" value={form.amaly_task_id ?? ''} onChange={(e) => set('amaly_task_id', e.target.value)} />
            </div>
          </div>

          {/* Revenue */}
          <div className="space-y-1.5">
            <label className="label">Revenue Impact (Tk/month)</label>
            <input className="input" placeholder="e.g. 5L/month, 2Cr/month" value={form.revenue_impact ?? ''} onChange={(e) => set('revenue_impact', e.target.value || null)} />
          </div>

          {/* Hypothesis */}
          <div className="space-y-1.5">
            <label className="label">Hypothesis</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="If we… then… because…" value={form.hypothesis ?? ''} onChange={(e) => set('hypothesis', e.target.value)} />
          </div>

          {/* Problem Statement */}
          <div className="space-y-1.5">
            <label className="label">Problem Statement</label>
            <textarea className="input min-h-[60px] resize-none" placeholder="What problem are we solving?" value={form.problem_statement ?? ''} onChange={(e) => set('problem_statement', e.target.value)} />
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <label className="label">Metrics</label>
            <div className="space-y-1.5">
              <p className="text-xs text-slate-900 dark:text-white/40">Primary</p>
              <input className="input" placeholder="e.g. CVR" value={form.metrics?.primary ?? ''} onChange={(e) => set('metrics', { ...form.metrics!, primary: e.target.value })} />
            </div>
            {(['secondary', 'guardrail'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <p className="text-xs text-slate-900 dark:text-white/40 capitalize">{field}</p>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={`Add ${field} metric`}
                    value={metricInput[field]}
                    onChange={(e) => setMetricInput((m) => ({ ...m, [field]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMetric(field); } }}
                  />
                  <button type="button" onClick={() => addMetric(field)} className="px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white/60 hover:text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {((form.metrics?.[field] ?? []) as string[]).map((m, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-white/10 text-slate-900 dark:text-white/70">
                      {m}
                      <X size={10} className="cursor-pointer hover:text-slate-900 dark:text-white" onClick={() => removeMetric(field, i)} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Baseline / Current */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Baseline Data</label>
              <textarea className="input min-h-[60px] resize-none text-sm" placeholder="Baseline CVR: 2.3%" value={form.baseline_data ?? ''} onChange={(e) => set('baseline_data', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Current Data</label>
              <textarea className="input min-h-[60px] resize-none text-sm" placeholder="Variant CVR: 2.7%" value={form.current_data ?? ''} onChange={(e) => set('current_data', e.target.value)} />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="label">Remarks</label>
            <textarea className="input min-h-[60px] resize-none" placeholder="Any additional notes…" value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-900 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-slate-900 dark:text-white transition-colors shadow-lg shadow-violet-500/20">
              {initial?.id ? 'Save Changes' : 'Create Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
