'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Inbox, Lightbulb, ClipboardList, X, Plus } from 'lucide-react';
import type { Idea, Platform, IdeaType } from '@/lib/types';
import { PageSelector } from './PageSelector';

const PLATFORMS: Platform[] = ['Web-Mobile', 'Web-Desk', 'App-iOS', 'App-Android'];

interface Props {
  ideas: Idea[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSubmit: (idea: Partial<Idea>) => void;
  onDelete: (id: number) => void;
  allPages: string[];
  onNewPage: (p: string) => void;
}

interface SubmitForm {
  submitted_by: string;
  title: string;
  hypothesis: string;
  platform: Platform[];
  pages: string[];
  type: IdeaType;
}

const defaultForm: SubmitForm = {
  submitted_by: '',
  title: '',
  hypothesis: '',
  platform: [],
  pages: [],
  type: 'experiment',
};

export function InboxTab({ ideas, onApprove, onReject, onSubmit, allPages, onNewPage }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SubmitForm>(defaultForm);
  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  const filtered = ideas.filter((i) => filter === 'All' || i.status === filter);
  const pendingCount = ideas.filter((i) => i.status === 'Pending').length;

  function togglePlatform(p: Platform) {
    setForm((f) => ({
      ...f,
      platform: f.platform.includes(p) ? f.platform.filter((x) => x !== p) : [...f.platform, p],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
    setForm(defaultForm);
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1 border border-slate-200 dark:border-white/10">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === s ? 'bg-white/10 text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white/40 hover:text-slate-900 dark:text-white/70'
              }`}
            >
              {s}
              {s === 'Pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-violet-500 text-slate-900 dark:text-white text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-slate-900 dark:text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20"
        >
          <Plus size={15} /> Submit Idea
        </button>
      </div>

      {/* Submission form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Submit Idea / Request</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-900 dark:text-white/50 hover:text-slate-900 dark:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="label">Your Name</label>
                  <input className="input" placeholder="John Doe" value={form.submitted_by} onChange={(e) => setForm((f) => ({ ...f, submitted_by: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as IdeaType }))}>
                    <option value="experiment">A/B Experiment</option>
                    <option value="task">Task / Request</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">Title</label>
                <input className="input" placeholder="Brief title for your idea" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>

              <div className="space-y-1.5">
                <label className="label">Hypothesis / Description</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Describe the idea or what you need..."
                  value={form.hypothesis}
                  onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
                  required
                />
              </div>

              {form.type === 'experiment' && (
                <>
                  <div className="space-y-1.5">
                    <label className="label">Platform</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p} type="button"
                          onClick={() => togglePlatform(p)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            form.platform.includes(p)
                              ? 'bg-violet-500/30 border-violet-500/60 text-violet-200'
                              : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white/50 hover:text-slate-900 dark:text-white'
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
                      selected={form.pages}
                      onChange={(pages) => setForm((f) => ({ ...f, pages }))}
                      allPages={allPages}
                      onNewPage={onNewPage}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-900 dark:text-white/60 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-slate-900 dark:text-white transition-colors">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ideas list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-900 dark:text-white/30">
          <Inbox size={40} className="mb-4 opacity-40" />
          <p className="text-base font-medium">No {filter.toLowerCase()} items</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((idea) => (
            <div key={idea.id} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/[0.02] p-4 space-y-3 group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {idea.type === 'experiment'
                    ? <Lightbulb size={16} className="shrink-0 text-yellow-400" />
                    : <ClipboardList size={16} className="shrink-0 text-blue-400" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{idea.title || idea.hypothesis}</p>
                    <p className="text-xs text-slate-900 dark:text-white/40 mt-0.5">by {idea.submitted_by} · {new Date(idea.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status badge */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    idea.status === 'Pending' ? 'bg-yellow-400/15 text-yellow-300'
                    : idea.status === 'Approved' ? 'bg-green-400/15 text-green-300'
                    : 'bg-red-400/15 text-red-300'
                  }`}>
                    {idea.status}
                  </span>

                  {/* Type badge */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    idea.type === 'experiment' ? 'bg-violet-400/15 text-violet-300' : 'bg-blue-400/15 text-blue-300'
                  }`}>
                    {idea.type === 'experiment' ? 'Experiment' : 'Task'}
                  </span>
                </div>
              </div>

              {idea.hypothesis && idea.title !== idea.hypothesis && (
                <p className="text-sm text-slate-900 dark:text-white/60 leading-relaxed pl-7">{idea.hypothesis}</p>
              )}

              {/* Platform & pages */}
              {(idea.platform.length > 0 || idea.pages.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pl-7">
                  {idea.platform.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white/50 border border-slate-200 dark:border-white/10">{p}</span>
                  ))}
                  {idea.pages.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">{p}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              {idea.status === 'Pending' && (
                <div className="flex gap-2 pl-7 pt-1">
                  <button
                    onClick={() => onApprove(idea.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/25 transition-colors"
                  >
                    <CheckCircle size={13} /> Approve & Promote
                  </button>
                  <button
                    onClick={() => onReject(idea.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 transition-colors"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}

              {idea.promoted && idea.promoted_to_id && (
                <p className="text-xs text-green-400/70 pl-7">
                  ✓ Promoted to {idea.type === 'experiment' ? 'Experiment' : 'Task'} #{idea.promoted_to_id}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
