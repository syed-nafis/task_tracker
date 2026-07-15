import { NextRequest } from 'next/server';
import { getTasks, insertTask, updateTask, deleteTask, nextId } from '@/lib/data';
import type { Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getTasks());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Task>;
  const newTask: Task = {
    id: await nextId('tasks'),
    title: body.title ?? 'Untitled Task',
    type: body.type ?? 'General',
    status: body.status ?? 'Active',
    assigned_by: body.assigned_by ?? null,
    subtasks: body.subtasks ?? [],
    source: body.source ?? 'self',
    promoted_from_idea_id: body.promoted_from_idea_id ?? null,
    created_at: body.created_at ?? new Date().toISOString(),
    completed_at: body.completed_at ?? null,
  };
  await insertTask(newTask);
  return Response.json(newTask, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Task;
  const tasks = await getTasks();
  const existing = tasks.find((t) => t.id === body.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  if (body.status === 'Completed' && existing.status !== 'Completed') {
    body.completed_at = new Date().toISOString();
  } else if (body.status !== 'Completed') {
    body.completed_at = null;
  }

  const updated: Task = { ...existing, ...body };
  await updateTask(body.id, updated);
  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: number };
  await deleteTask(id);
  return Response.json({ ok: true });
}
