'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { Task, TaskStatus, TaskType, Subtask } from '@/lib/types';

const TASK_TYPES: TaskType[] = ['GA4 Report', 'Analysis', 'General', 'Other'];
const STATUSES: TaskStatus[] = ['Active', 'In Progress', 'Completed'];

interface Props {
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initial?: Partial<Task>;
}

export function TaskModal({ onClose, onSave, initial }: Props) {
  const [form, setForm] = useState<Partial<Task>>({
    title: '',
    type: 'General',
    status: 'Active',
    subtasks: [],
    dependencies: [],
    created_at: new Date().toISOString(),
    ...initial,
  });

  const [subtaskInput, setSubtaskInput] = useState('');
  const [dependencyInput, setDependencyInput] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function set<K extends keyof Task>(key: K, val: Task[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addSubtask() {
    const title = subtaskInput.trim();
    if (!title) return;
    const newSub: Subtask = { id: Date.now(), title, status: 'Active' };
    set('subtasks', [...(form.subtasks || []), newSub]);
    setSubtaskInput('');
  }

  function removeSubtask(id: number) {
    set('subtasks', (form.subtasks || []).filter((s) => s.id !== id));
  }

  function addDependency() {
    const text = dependencyInput.trim();
    if (!text) return;
    set('dependencies', [...(form.dependencies || []), text]);
    setDependencyInput('');
  }

  function removeDependency(text: string) {
    set('dependencies', (form.dependencies || []).filter((d) => d !== text));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  // Helper to format date for input type="date"
  const dateValue = form.created_at ? new Date(form.created_at).toISOString().split('T')[0] : '';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f0f1a]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {initial?.id ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="label">Title</label>
            <input className="input" placeholder="Task title" value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => set('type', e.target.value as TaskType)}>
                {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label">Date Created</label>
              <input type="date" className="input" value={dateValue} onChange={(e) => {
                if (e.target.value) {
                  set('created_at', new Date(e.target.value).toISOString());
                }
              }} required />
            </div>
          </div>

          <div className="space-y-3">
            <label className="label">Subtasks</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a subtask…"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              />
              <button type="button" onClick={addSubtask} className="px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {form.subtasks && form.subtasks.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <span className="text-sm text-slate-700 dark:text-white/80">{sub.title}</span>
                    <button type="button" onClick={() => removeSubtask(sub.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="label">Dependencies</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a dependency…"
                value={dependencyInput}
                onChange={(e) => setDependencyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDependency(); } }}
              />
              <button type="button" onClick={addDependency} className="px-3 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Plus size={14} />
              </button>
            </div>
            {form.dependencies && form.dependencies.length > 0 && (
              <div className="space-y-1 mt-2">
                {form.dependencies.map((dep, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <span className="text-sm text-slate-700 dark:text-white/80">{dep}</span>
                    <button type="button" onClick={() => removeDependency(dep)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-lg shadow-violet-500/20">
              {initial?.id ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
