import { NextRequest } from 'next/server';
import {
  getExperiments, getExperiment, insertExperiment, updateExperiment,
  deleteExperiment, nextId, addPages,
} from '@/lib/data';
import { emptyResults } from '@/lib/types';
import type { Experiment } from '@/lib/types';
import { experimentInput, experimentUpdate, deleteInput, parseBody, toDateOnly, daysBetween } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

// A test can't be Completed while its decision is still open.
function invariantError(exp: Experiment): Response | null {
  if (exp.status === 'Completed' && exp.result === 'In Progress') {
    return Response.json(
      { error: 'Set a decision (Winner / Loser / Inconclusive / Stopped) before marking a test Completed.' },
      { status: 400 },
    );
  }
  return null;
}

export async function GET() {
  return Response.json(await getExperiments());
}

export async function POST(req: NextRequest) {
  const { data: body, error } = await parseBody(req, experimentInput);
  if (error) return error;

  const now = new Date().toISOString();
  const id = await nextId('experiments');
  const status = body.status ?? 'Idea';
  const start_date = toDateOnly(body.start_date);
  const end_date = toDateOnly(body.end_date);
  const newExp: Experiment = {
    id,
    test_id: `TEST-${String(id).padStart(3, '0')}`,
    title: body.title?.trim() || 'Untitled Experiment',
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
    start_date,
    end_date,
    duration_days: daysBetween(start_date, end_date),
    remarks: body.remarks ?? '',
    growthbook_id: body.growthbook_id ?? '',
    amaly_task_id: body.amaly_task_id ?? '',
    source: body.source ?? 'self',
    promoted_from_idea_id: body.promoted_from_idea_id ?? null,
    created_at: now,
  };

  const bad = invariantError(newExp);
  if (bad) return bad;

  await addPages(newExp.pages);
  await insertExperiment(newExp);
  return Response.json(newExp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { data: body, error } = await parseBody(req, experimentUpdate);
  if (error) return error;

  const existing = await getExperiment(body.id);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  // Partial merge: clients send only the fields they changed, so a stale
  // client can't clobber fields it never touched.
  const updated: Experiment = { ...existing, ...body };
  updated.start_date = toDateOnly(updated.start_date);
  updated.end_date = toDateOnly(updated.end_date);
  updated.duration_days = daysBetween(updated.start_date, updated.end_date);

  // Record stage transitions server-side so history can't be lost by clients.
  if (body.status && body.status !== existing.status) {
    const history = body.stage_history ?? existing.stage_history ?? [];
    updated.stage_history = [
      ...history,
      { stage: body.status, entered_at: new Date().toISOString(), note: '' },
    ];
  }

  const bad = invariantError(updated);
  if (bad) return bad;

  if (body.pages && body.pages.length > 0) await addPages(body.pages);
  await updateExperiment(body.id, updated);
  return Response.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { data, error } = await parseBody(req, deleteInput);
  if (error) return error;
  await deleteExperiment(data.id);
  return Response.json({ ok: true });
}
