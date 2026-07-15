'use client';

import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Pencil, Trash2, Calendar, Link, ChevronDown, ChevronRight } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './TaskModal';

const STATUSES: TaskStatus[] = ['Active', 'In Progress', 'Completed'];

const typeColors: Record<string, string> = {
  'GA4 Report': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-400/15 dark:text-orange-300 dark:border-orange-500/25',
  'Analysis': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-400/15 dark:text-blue-300 dark:border-blue-500/25',
  'General': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:border-slate-500/25',
  'Other': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-400/15 dark:text-purple-300 dark:border-purple-500/25',
};

const statusColors: Record<TaskStatus, string> = {
  'Active': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:border-slate-500/25',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-400/15 dark:text-blue-300 dark:border-blue-500/25',
  'Completed': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-400/15 dark:text-green-300 dark:border-green-500/25',
};

interface Props {
  tasks: Task[];
  onAdd: (t: Partial<Task>) => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: number) => void;
}

export function TaskList({ tasks, onAdd, onUpdate, onDelete }: Props) {
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filtered = tasks.filter((t) => filter === 'All' || t.status === filter);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function cycleStatus(task: Task) {
    const idx = STATUSES.indexOf(task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    onUpdate({ ...task, status: next });
  }

  function handleSave(taskData: Partial<Task>) {
    if (editingTask) {
      onUpdate({ ...editingTask, ...taskData } as Task);
    } else {
      onAdd(taskData);
    }
    setShowModal(false);
    setEditingTask(null);
  }

  function toggleSubtask(task: Task, subId: number) {
    const updated = (task.subtasks ?? []).map((s) =>
      s.id === subId ? { ...s, status: (s.status === 'Completed' ? 'Active' : 'Completed') as TaskStatus } : s
    );
    onUpdate({ ...task, subtasks: updated });
  }

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1 w-fit border border-slate-200 dark:border-white/10">
          {(['All', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === s
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70'
                }`}
            >
              {s}
              <span className="ml-1.5 text-xs opacity-60">
                {s === 'All' ? tasks.length : tasks.filter((t) => t.status === s).length}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setEditingTask(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20"
        >
          <Plus size={15} /> New Task
        </button>
      </div>

      {/* Task grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-white/30">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-base font-medium">No tasks here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task) => {
            const completedSubs = (task.subtasks ?? []).filter((s) => s.status === 'Completed').length;
            const totalSubs = (task.subtasks ?? []).length;
            const deps = task.dependencies || [];
            const isExpanded = expandedIds.has(task.id);

            return (
              <div key={task.id} className="relative flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:bg-white/[0.04] transition-colors group shadow-sm dark:shadow-none">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => cycleStatus(task)}
                      className="shrink-0 mt-0.5 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/80 transition-colors"
                      title={`Status: ${task.status} — click to advance`}
                    >
                      {task.status === 'Completed'
                        ? <CheckCircle2 size={18} className="text-green-500 dark:text-green-400" />
                        : task.status === 'In Progress'
                          ? <Circle size={18} className="text-blue-500 dark:text-blue-400" />
                          : <Circle size={18} />
                      }
                    </button>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-semibold truncate ${task.status === 'Completed' ? 'line-through text-slate-400 dark:text-white/30' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </h3>
                      {task.assigned_by && (
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">from {task.assigned_by}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingTask(task); setShowModal(true); }}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete task?')) onDelete(task.id); }}
                      className="p-1.5 rounded text-slate-400 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400 bg-slate-50 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs border font-medium ${typeColors[task.type] ?? ''}`}>
                        {task.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border font-medium ${statusColors[task.status]}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                      <Calendar size={13} />
                      {task.status === 'Completed' && task.completed_at 
                        ? <span>Done: {new Date(task.completed_at).toLocaleDateString()}</span>
                        : <span>Added: {new Date(task.created_at).toLocaleDateString()}</span>
                      }
                    </div>
                  </div>

                  {/* Subtasks & Dependencies info */}
                  {(totalSubs > 0 || deps.length > 0) && (
                    <div className="flex flex-wrap gap-3 text-xs">
                      {totalSubs > 0 && (
                        <button onClick={() => toggleExpand(task.id)} className={`flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity ${completedSubs === totalSubs ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-white/60'}`}>
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          {completedSubs}/{totalSubs} subtasks
                        </button>
                      )}
                      {deps.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/60 font-medium">
                          <Link size={13} />
                          {deps.length} dependenc{deps.length === 1 ? 'y' : 'ies'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Subtasks */}
                {isExpanded && totalSubs > 0 && (
                  <div className="px-4 pb-4 space-y-2 border-t border-slate-100 dark:border-white/5 pt-3">
                    {(task.subtasks ?? []).map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <button onClick={() => toggleSubtask(task, sub.id)} className="text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/70 transition-colors shrink-0">
                          {sub.status === 'Completed'
                            ? <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" />
                            : <Circle size={14} />
                          }
                        </button>
                        <span className={`text-sm ${sub.status === 'Completed' ? 'line-through text-slate-400 dark:text-white/30' : 'text-slate-700 dark:text-white/80'}`}>
                          {sub.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TaskModal
          initial={editingTask || undefined}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
