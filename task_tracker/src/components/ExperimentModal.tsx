'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, ClipboardList, GitBranch, BarChart3 } from 'lucide-react';
import type { Experiment, Platform, ExperimentStatus, ExperimentResult } from '@/lib/types';
import { PIPELINE_STAGES, emptyResults } from '@/lib/types';
import { PageSelector } from './PageSelector';
import { PipelineBar } from './PipelineBar';
import { StageHistory } from './StageHistory';
import { ResultsPanel } from './ResultsPanel';

const PLATFORMS: Platform[] = ['Web-Mobile', 'Web-Desk', 'App-iOS', 'App-Android'];
const RESULTS: ExperimentResult[] = ['In Progress', 'Winner', 'Loser', 'Inconclusive', 'Stopped'];
const METRIC_PRESETS = ['CVR', 'ATC Rate', 'AOV', 'Revenue/User', 'Bounce Rate', 'Checkout Rate'];

type ModalTab = 'overview' | 'pipeline' | 'results';

interface Props {
  onClose: () => void;
  onSave: (exp: Partial<Experiment>) => void;
  initial?: Partial<Experiment>;
  allPages: string[];
  onNewPage: (p: string) => void;
}

export function ExperimentModal({ onClose, onSave, initial, allPages, onNewPage }: Props) {
  const isEdit = Boolean(initial?.id);
  const [tab, setTab] = useState<ModalTab>('overview');
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
    stage_history: [],
    results: emptyResults(),
    start_date: isEdit ? null : new Date().toISOString().split('T')[0],
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

  function addMetric(field: 'secondary' | 'guardrail', value?: string) {
    const val = (value ?? metricInput[field]).trim();
    if (!val) return;
    const cur = (form.metrics?.[field] as string[]) ?? [];
    if (cur.includes(val)) return;
    set('metrics', { ...form.metrics!, [field]: [...cur, val] });
    if (!value) setMetricInput((m) => ({ ...m, [field]: '' }));
  }

  function removeMetric(field: 'secondary' | 'guardrail', idx: number) {
    const cur = (form.metrics?.[field] as string[]).filter((_, i) => i !== idx);
    set('metrics', { ...form.metrics!, [field]: cur });
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title?.trim()) { setTab('overview'); return; }
    onSave(form);
  }

  const tabs: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <ClipboardList size={14} /> },
    { id: 'pipeline', label: 'Pipeline', icon: <GitBranch size={14} /> },
    { id: 'results', label: 'Results', icon: <BarChart3 size={14} /> },
  ];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(); }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a] shadow-2xl">
        {/* Header */}
        <div className="shrink-0 px-6 pt-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEdit ? `Edit ${initial?.test_id ?? 'Experiment'}` : 'New Experiment'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          {/* Modal tabs */}
          <div className="flex gap-1 mt-3 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/5'
                    : 'border-transparent text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* ============ OVERVIEW ============ */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="label">Title *</label>
                <input className="input" placeholder="Experiment title" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} required autoFocus />
              </div>

              <div className="space-y-1.5">
                <label className="label">Hypothesis</label>
                <textarea className="input min-h-[80px] resize-none" placeholder="If we… then… because…" value={form.hypothesis ?? ''} onChange={(e) => set('hypothesis', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="label">Problem Statement</label>
                <textarea className="input min-h-[60px] resize-none" placeholder="What problem are we solving?" value={form.problem_statement ?? ''} onChange={(e) => set('problem_statement', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="label">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.platform?.includes(p)
                          ? 'bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300'
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Pages</label>
                <PageSelector
                  selected={form.pages ?? []}
                  onChange={(pages) => set('pages', pages)}
                  allPages={allPages}
                  onNewPage={onNewPage}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Creator</label>
                  <input className="input" placeholder="Your name" value={form.creator ?? ''} onChange={(e) => set('creator', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Revenue Impact (Tk/month)</label>
                  <input className="input" placeholder="e.g. 5L/month, 2Cr/month" value={form.revenue_impact ?? ''} onChange={(e) => set('revenue_impact', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={form.start_date?.split('T')[0] ?? ''} onChange={(e) => set('start_date', e.target.value || null)} />
                </div>
                <div className="space-y-1.5">
                  <label className="label">End Date</label>
                  <input type="date" className="input" value={form.end_date?.split('T')[0] ?? ''} onChange={(e) => set('end_date', e.target.value || null)} />
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

              {/* Planning metrics */}
              <div className="space-y-3">
                <label className="label">Metrics (planned)</label>
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 dark:text-white/40">Primary</p>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {METRIC_PRESETS.map((p) => (
                      <button
                        key={p} type="button"
                        onClick={() => set('metrics', { ...form.metrics!, primary: p })}
                        className={`px-2 py-0.5 rounded-md text-xs border transition-colors ${
                          form.metrics?.primary === p
                            ? 'bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/45 hover:text-violet-600 dark:hover:text-violet-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <input className="input" placeholder="e.g. CVR" value={form.metrics?.primary ?? ''} onChange={(e) => set('metrics', { ...form.metrics!, primary: e.target.value })} />
                </div>
                {(['secondary', 'guardrail'] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <p className="text-xs text-slate-500 dark:text-white/40 capitalize">{field}</p>
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        placeholder={`Add ${field} metric (Enter)`}
                        value={metricInput[field]}
                        onChange={(e) => setMetricInput((m) => ({ ...m, [field]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMetric(field); } }}
                      />
                      <button type="button" onClick={() => addMetric(field)} className="px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {METRIC_PRESETS.filter((p) => !(form.metrics?.[field] as string[] ?? []).includes(p)).map((p) => (
                        <button
                          key={p} type="button"
                          onClick={() => addMetric(field, p)}
                          className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/35 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        >
                          + {p}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {((form.metrics?.[field] ?? []) as string[]).map((m, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-violet-500/10 text-violet-700 dark:text-violet-300">
                          {m}
                          <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => removeMetric(field, i)} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="label">Remarks</label>
                <textarea className="input min-h-[60px] resize-none" placeholder="Any additional notes…" value={form.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} />
              </div>
            </div>
          )}

          {/* ============ PIPELINE ============ */}
          {tab === 'pipeline' && (
            <div className="space-y-6">
              <PipelineBar status={form.status ?? 'Idea'} />

              <div className="space-y-1.5">
                <label className="label">Pipeline Stage</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as ExperimentStatus)}>
                  {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {isEdit && form.status !== initial?.status && (
                  <p className="text-xs text-violet-500">Stage change will be timestamped in history on save.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="label">Stage History</label>
                {(form.stage_history?.length ?? 0) > 0 ? (
                  <StageHistory
                    history={form.stage_history!}
                    onChange={(h) => set('stage_history', h)}
                  />
                ) : (
                  <p className="text-sm text-slate-400 dark:text-white/30">
                    {isEdit ? 'No stage history recorded.' : 'History starts when the experiment is created.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ============ RESULTS ============ */}
          {tab === 'results' && (
            <div className="space-y-5">
              <div className="space-y-1.5 max-w-xs">
                <label className="label">Decision</label>
                <select className="input" value={form.result} onChange={(e) => set('result', e.target.value as ExperimentResult)}>
                  {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <ResultsPanel
                results={form.results ?? emptyResults()}
                onChange={(r) => set('results', r)}
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs text-slate-400 dark:text-white/25">⌘⏎ to save</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={() => handleSubmit()} className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-lg shadow-violet-500/20">
              {isEdit ? 'Save Changes' : 'Create Experiment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
