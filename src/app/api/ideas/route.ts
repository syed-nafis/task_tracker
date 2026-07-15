import { NextRequest } from 'next/server';
import {
  getIdeas, getIdea, insertIdea, updateIdea, deleteIdea,
  insertExperiment, insertTask, nextId, addPages,
} from '@/lib/data';
import { emptyResults } from '@/lib/types';
import type { Idea, Experiment, Task } from '@/lib/types';
import { ideaInput, ideaUpdate, deleteInput, parseBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getIdeas());
}

export async function POST(req: NextRequest) {
  const { data: body, error } = await parseBody(req, ideaInput);
  if (error) return error;

  const newIdea: Idea = {
    id: await nextId('ideas'),
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
  await addPages(newIdea.pages);
  await insertIdea(newIdea);
  return Response.json(newIdea, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { data: body, error } = await parseBody(req, ideaUpdate);
  if (error) return error;

  const idea = await getIdea(body.id);
  if (!idea) return Response.json({ error: 'Not found' }, { status: 404 });

  if (body.action === 'approve') {
    // Idempotence guard: approving twice must not promote twice.
    if (idea.promoted || idea.status !== 'Pending') {
      return Response.json({ error: `Idea already ${idea.status.toLowerCase()}` }, { status: 409 });
    }
    idea.status = 'Approved';
    idea.promoted = true;
    const now = new Date().toISOString();

    if (idea.type === 'experiment') {
      const expId = await nextId('experiments');
      const newExp: Experiment = {
        id: expId,
        test_id: `TEST-${String(expId).padStart(3, '0')}`,
        title: idea.title,
        status: 'Idea',
        platform: idea.platform,
        pages: idea.pages,
        hypothesis: idea.hypothesis,
        problem_statement: '',
        metrics: { primary: 'CVR', secondary: [], guardrail: [] },
        result: 'In Progress',
        revenue_impact: null,
        creator: idea.submitted_by,
        stage_history: [{ stage: 'Idea', entered_at: now, note: '' }],
        results: emptyResults(),
        start_date: null,
        end_date: null,
        duration_days: null,
        remarks: '',
        growthbook_id: '',
        amaly_task_id: '',
        source: 'inbox',
        promoted_from_idea_id: idea.id,
        created_at: now,
      };
      idea.promoted_to_id = expId;
      await insertExperiment(newExp);
    } else {
      const taskId = await nextId('tasks');
      const newTask: Task = {
        id: taskId,
        title: idea.title || idea.hypothesis,
        type: 'General',
        status: 'Active',
        assigned_by: idea.submitted_by,
        subtasks: [],
        source: 'inbox',
        promoted_from_idea_id: idea.id,
        created_at: now,
        completed_at: null,
      };
      idea.promoted_to_id = taskId;
      await insertTask(newTask);
    }
    await updateIdea(idea.id, idea);
  } else if (body.action === 'reject') {
    if (idea.status !== 'Pending') {
      return Response.json({ error: `Idea already ${idea.status.toLowerCase()}` }, { status: 409 });
    }
    idea.status = 'Rejected';
    await updateIdea(idea.id, idea);
  } else {
    // plain field update
    const updated: Idea = { ...idea, ...body };
    await updateIdea(idea.id, updated);
    return Response.json(updated);
  }

  return Response.json(idea);
}

export async function DELETE(req: NextRequest) {
  const { data, error } = await parseBody(req, deleteInput);
  if (error) return error;
  await deleteIdea(data.id);
  return Response.json({ ok: true });
}
