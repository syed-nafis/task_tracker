import { NextRequest } from 'next/server';
import { getTasks, saveTasks, nextId } from '@/lib/db';
import type { Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getTasks());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Task>;
  const tasks = getTasks();
  const newTask: Task = {
    id: nextId(tasks),
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
  tasks.push(newTask);
  saveTasks(tasks);
  return Response.json(newTask, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Task;
  const tasks = getTasks();
  const idx = tasks.findIndex((t) => t.id === body.id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  
  if (body.status === 'Completed' && tasks[idx].status !== 'Completed') {
    body.completed_at = new Date().toISOString();
  } else if (body.status !== 'Completed') {
    body.completed_at = null;
  }

  tasks[idx] = { ...tasks[idx], ...body };
  saveTasks(tasks);
  return Response.json(tasks[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: number };
  saveTasks(getTasks().filter((t) => t.id !== id));
  return Response.json({ ok: true });
}
