import { NextRequest } from 'next/server';
import { getIdeas, saveIdeas, nextId, getExperiments, saveExperiments, getTasks, saveTasks, getPages, savePages } from '@/lib/db';
import type { Idea, Experiment, Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getIdeas());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Idea>;
  const ideas = getIdeas();
  const newIdea: Idea = {
    id: nextId(ideas),
    submitted_by: body.submitted_by ?? 'Guest',
    title: body.title ?? '',
    hypothesis: body.hypothesis ?? '',
    platform: body.platform ?? [],
    pages: body.pages ?? [],
    type: body.type ?? 'experiment',
    status: 'Pending',
    promoted: false,
    promoted_to_id: null,
    created_at: new Date().toISOString(),
  };
  if (newIdea.pages.length > 0) {
    savePages(Array.from(new Set([...getPages(), ...newIdea.pages])));
  }
  ideas.push(newIdea);
  saveIdeas(ideas);
  return Response.json(newIdea, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as { id: number; action: 'approve' | 'reject' } & Partial<Idea>;
  const ideas = getIdeas();
  const idx = ideas.findIndex((i) => i.id === body.id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });

  if (body.action === 'approve') {
    ideas[idx].status = 'Approved';
    ideas[idx].promoted = true;

    if (ideas[idx].type === 'experiment') {
      const experiments = getExperiments();
      const now = new Date().toISOString();
      const expId = Math.max(0, ...experiments.map((e) => e.id)) + 1;
      const newExp: Experiment = {
        id: expId,
        test_id: `EXP-${String(expId).padStart(3, '0')}`,
        title: ideas[idx].title,
        status: 'Idea',
        platform: ideas[idx].platform,
        pages: ideas[idx].pages,
        hypothesis: ideas[idx].hypothesis,
        problem_statement: '',
        metrics: { primary: 'CVR', secondary: [], guardrail: [] },
        result: 'In Progress',
        revenue_impact: null,
        creator: ideas[idx].submitted_by,
        baseline_data: '',
        current_data: '',
        start_date: null,
        end_date: null,
        duration_days: null,
        remarks: '',
        growthbook_id: '',
        amaly_task_id: '',
        source: 'inbox',
        promoted_from_idea_id: ideas[idx].id,
        created_at: now,
      };
      ideas[idx].promoted_to_id = expId;
      experiments.push(newExp);
      saveExperiments(experiments);
    } else {
      const tasks = getTasks();
      const taskId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
      const newTask: Task = {
        id: taskId,
        title: ideas[idx].title || ideas[idx].hypothesis,
        type: 'General',
        status: 'Active',
        assigned_by: ideas[idx].submitted_by,
        subtasks: [],
        source: 'inbox',
        promoted_from_idea_id: ideas[idx].id,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      ideas[idx].promoted_to_id = taskId;
      tasks.push(newTask);
      saveTasks(tasks);
    }
  } else if (body.action === 'reject') {
    ideas[idx].status = 'Rejected';
  } else {
    // plain update
    ideas[idx] = { ...ideas[idx], ...body };
  }

  saveIdeas(ideas);
  return Response.json(ideas[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: number };
  saveIdeas(getIdeas().filter((i) => i.id !== id));
  return Response.json({ ok: true });
}
