'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, ListTodo, Inbox, RefreshCw, Plus, Columns3, BarChart3 } from 'lucide-react';
import type { Experiment, Task, Idea, ExperimentStatus } from '@/lib/types';
import { ExperimentTable } from '@/components/ExperimentTable';
import { ExperimentModal } from '@/components/ExperimentModal';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ReportsTab } from '@/components/ReportsTab';
import { TaskList } from '@/components/TaskList';
import { InboxTab } from '@/components/InboxTab';
import { ThemeToggle } from '@/components/ThemeToggle';

type Tab = 'tasks' | 'experiments' | 'board' | 'inbox' | 'reports';

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('experiments');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Experiment | null>(null);

  async function fetchAll() {
    const [exps, tsks, idls, pgs] = await Promise.all([
      fetch('/api/experiments').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/ideas').then((r) => r.json()),
      fetch('/api/pages-registry').then((r) => r.json()),
    ]);
    setExperiments(exps);
    setTasks(tsks);
    setIdeas(idls);
    setPages(pgs);
  }

  // Full-screen loader only on first load; later fetchAll() calls refresh in place.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- all setState happens after await, not synchronously
    fetchAll().finally(() => setLoading(false));
  }, []);

  function refresh() {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }

  // --- Experiments ---
  async function saveExperiment(data: Partial<Experiment>) {
    if (editingExp) {
      await fetch('/api/experiments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...editingExp, ...data }) });
    } else {
      await fetch('/api/experiments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setShowExpModal(false);
    setEditingExp(null);
    fetchAll();
  }

  async function deleteExperiment(id: number) {
    await fetch('/api/experiments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  }

  async function changeStage(exp: Experiment, status: ExperimentStatus) {
    // Optimistic update so board moves instantly; server appends stage_history.
    setExperiments((prev) => prev.map((e) => (e.id === exp.id ? { ...e, status } : e)));
    await fetch('/api/experiments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...exp, status }) });
    fetchAll();
  }

  // --- Tasks ---
  async function addTask(data: Partial<Task>) {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    fetchAll();
  }

  async function updateTask(data: Task) {
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    fetchAll();
  }

  async function deleteTask(id: number) {
    await fetch('/api/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  }

  // --- Ideas ---
  async function submitIdea(data: Partial<Idea>) {
    await fetch('/api/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    fetchAll();
  }

  async function approveIdea(id: number) {
    await fetch('/api/ideas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) });
    fetchAll();
  }

  async function rejectIdea(id: number) {
    await fetch('/api/ideas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'reject' }) });
    fetchAll();
  }

  async function deleteIdea(id: number) {
    await fetch('/api/ideas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchAll();
  }

  async function addPage(page: string) {
    await fetch('/api/pages-registry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page }) });
    setPages((p) => Array.from(new Set([...p, page])));
  }

  const pendingIdeas = ideas.filter((i) => i.status === 'Pending').length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'tasks', label: 'My Tasks', icon: <ListTodo size={16} />, count: tasks.filter((t) => t.status !== 'Completed').length },
    { id: 'experiments', label: 'A/B Tests', icon: <FlaskConical size={16} />, count: experiments.length },
    { id: 'board', label: 'Board', icon: <Columns3 size={16} /> },
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={16} />, count: pendingIdeas || undefined },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen mesh-bg">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#080810]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <FlaskConical size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">CRO Command Center</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold leading-none ${
                    t.id === 'inbox' ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs font-medium text-slate-500 dark:text-white/40 border-r border-slate-200 dark:border-white/10 pr-3 mr-1">
              Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <ThemeToggle />
            <button
              onClick={refresh}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {(tab === 'experiments' || tab === 'board') && (
              <button
                onClick={() => { setEditingExp(null); setShowExpModal(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20"
              >
                <Plus size={14} /> New Experiment
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          {(tab === 'experiments' || tab === 'board' || tab === 'reports') && (
            <>
              <Stat label="Total Experiments" value={experiments.length} />
              <Stat label="Live" value={experiments.filter((e) => e.status === 'Live').length} accent />
              <Stat label="Winners" value={experiments.filter((e) => e.result === 'Winner').length} green />
              <Stat label="Completed" value={experiments.filter((e) => e.status === 'Completed').length} />
            </>
          )}
          {tab === 'tasks' && (
            <>
              <Stat label="Total Tasks" value={tasks.length} />
              <Stat label="Active Tasks" value={tasks.filter((t) => t.status !== 'Completed').length} accent />
              <Stat label="Completed" value={tasks.filter((t) => t.status === 'Completed').length} green />
            </>
          )}
          {tab === 'inbox' && (
            <>
              <Stat label="Total Submissions" value={ideas.length} />
              <Stat label="Pending Ideas" value={pendingIdeas} accent />
              <Stat label="Approved" value={ideas.filter((i) => i.status === 'Approved').length} green />
              <Stat label="Rejected" value={ideas.filter((i) => i.status === 'Rejected').length} />
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-white/30">
              <RefreshCw size={24} className="animate-spin" />
              <p className="text-sm">Loading…</p>
            </div>
          </div>
        ) : (
          <>
            {tab === 'experiments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">A/B Tests</h1>
                    <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">{experiments.length} experiment{experiments.length !== 1 ? 's' : ''} tracked</p>
                  </div>
                </div>
                <ExperimentTable
                  experiments={experiments}
                  onEdit={(exp) => { setEditingExp(exp); setShowExpModal(true); }}
                  onDelete={deleteExperiment}
                />
              </div>
            )}

            {tab === 'board' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Pipeline Board</h1>
                  <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Move tests through the pipeline — every stage change is timestamped</p>
                </div>
                <KanbanBoard
                  experiments={experiments}
                  onOpen={(exp) => { setEditingExp(exp); setShowExpModal(true); }}
                  onStageChange={changeStage}
                />
              </div>
            )}

            {tab === 'reports' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Reports</h1>
                  <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Program health across your A/B testing pipeline</p>
                </div>
                <ReportsTab experiments={experiments} />
              </div>
            )}

            {tab === 'tasks' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">My Tasks</h1>
                  <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">{tasks.filter((t) => t.status !== 'Completed').length} active task{tasks.filter((t) => t.status !== 'Completed').length !== 1 ? 's' : ''}</p>
                </div>
                <TaskList
                  tasks={tasks}
                  onAdd={addTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              </div>
            )}

            {tab === 'inbox' && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Inbox</h1>
                  <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">Ideas submitted and tasks assigned to you</p>
                </div>
                <InboxTab
                  ideas={ideas}
                  onApprove={approveIdea}
                  onReject={rejectIdea}
                  onSubmit={submitIdea}
                  onDelete={deleteIdea}
                  allPages={pages}
                  onNewPage={addPage}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Experiment Modal */}
      {showExpModal && (
        <ExperimentModal
          onClose={() => { setShowExpModal(false); setEditingExp(null); }}
          onSave={saveExperiment}
          initial={editingExp ?? undefined}
          allPages={pages}
          onNewPage={addPage}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent, green }: { label: string; value: number; accent?: boolean; green?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`text-lg font-bold tabular-nums ${accent ? 'text-blue-500 dark:text-blue-400' : green ? 'text-green-500 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-slate-500 dark:text-white/35">{label}</span>
    </div>
  );
}
