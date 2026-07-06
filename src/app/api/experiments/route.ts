import { NextRequest } from 'next/server';
import {
  getExperiments, getExperiment, insertExperiment, updateExperiment,
  deleteExperiment, nextId, addPages,
} from '@/lib/data';
import { emptyResults } from '@/lib/types';
import type { Experiment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getExperiments());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Experiment>;
  const now = new Date().toISOString();
  const id = await nextId('experiments');
  const status = body.status ?? 'Idea';
  const newExp: Experiment = {
    id,
    test_id: `EXP-${String(id).padStart(3, '0')}`,
    title: body.title ?? 'Untitled Experiment',
    status,
    platform: body.platform ?? [],
    pages: body.pages ?? [],
    hypothesis: body.hypothesis ?? '',
    problem_statement: body.problem_statement ?? '',
    metrics: body.metrics ?? { primary: 'CVR', secondary: [], guardrail: [] },
    result: body.result ?? 'In Progress',
    revenue_impact: body.revenue_impact ?? null,
    creator: body.creator ?? '',
    stage_history: body.stage_history ?? [{ stage: status, entered_at: now, note: '' }],
    results: body.results ?? emptyResults(),
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    duration_days: body.duration_days ?? null,
    remarks: body.remarks ?? '',
    growthbook_id: body.growthbook_id ?? '',
    amaly_task_id: body.amaly_task_id ?? '',
    source: body.source ?? 'self',
    promoted_from_idea_id: body.promoted_from_idea_id ?? null,
    created_at: now,
  };
  await addPages(newExp.pages);
  await insertExperiment(newExp);
  return Response.json(newExp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Experiment;
  const existing = await getExperiment(body.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const updated: Experiment = { ...existing, ...body };

  // Record stage transitions server-side so history can't be lost by clients.
  if (body.status && body.status !== existing.status) {
    const history = body.stage_history ?? existing.stage_history ?? [];
    updated.stage_history = [
      ...history,
      { stage: body.status, entered_at: new Date().toISOString(), note: '' },
    ];
  }

  if (body.pages && body.pages.length > 0) await addPages(body.pages);
  await updateExperiment(body.id, updated);
  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: number };
  await deleteExperiment(id);
  return Response.json({ ok: true });
}
