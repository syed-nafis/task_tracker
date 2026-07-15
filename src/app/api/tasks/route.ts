import { NextRequest } from 'next/server';
import { getTasks, getTask, insertTask, updateTask, deleteTask, nextId } from '@/lib/data';
import type { Task } from '@/lib/types';
import { taskInput, taskUpdate, deleteInput, parseBody } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getTasks());
}

export async function POST(req: NextRequest) {
  const { data: body, error } = await parseBody(req, taskInput);
  if (error) return error;

  const newTask: Task = {
    id: await nextId('tasks'),
    title: body.title?.trim() || 'Untitled Task',
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
  const { data: body, error } = await parseBody(req, taskUpdate);
  if (error) return error;

  const existing = await getTask(body.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const updated: Task = { ...existing, ...body };
  // Stamp/clear completed_at on status transitions server-side.
  if (updated.status === 'Completed' && existing.status !== 'Completed') {
    updated.completed_at = new Date().toISOString();
  } else if (updated.status !== 'Completed') {
    updated.completed_at = null;
  }

  await updateTask(body.id, updated);
  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { data, error } = await parseBody(req, deleteInput);
  if (error) return error;
  await deleteTask(data.id);
  return Response.json({ ok: true });
}
