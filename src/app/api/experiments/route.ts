import { NextRequest } from 'next/server';
import { getExperiments, saveExperiments, nextId, getPages, savePages } from '@/lib/db';
import type { Experiment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getExperiments());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Experiment>;
  const experiments = getExperiments();
  const now = new Date().toISOString();
  const newExp: Experiment = {
    id: nextId(experiments),
    test_id: `EXP-${String(nextId(experiments)).padStart(3, '0')}`,
    title: body.title ?? 'Untitled Experiment',
    status: body.status ?? 'Idea',
    platform: body.platform ?? [],
    pages: body.pages ?? [],
    hypothesis: body.hypothesis ?? '',
    problem_statement: body.problem_statement ?? '',
    metrics: body.metrics ?? { primary: 'CVR', secondary: [], guardrail: [] },
    result: body.result ?? 'In Progress',
    revenue_impact: body.revenue_impact ?? null,
    creator: body.creator ?? '',
    baseline_data: body.baseline_data ?? '',
    current_data: body.current_data ?? '',
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
  // auto-register pages
  if (newExp.pages.length > 0) {
    const pages = getPages();
    const merged = Array.from(new Set([...pages, ...newExp.pages]));
    savePages(merged);
  }
  experiments.push(newExp);
  saveExperiments(experiments);
  return Response.json(newExp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Experiment;
  const experiments = getExperiments();
  const idx = experiments.findIndex((e) => e.id === body.id);
  if (idx === -1) return Response.json({ error: 'Not found' }, { status: 404 });
  experiments[idx] = { ...experiments[idx], ...body };
  if (body.pages?.length > 0) {
    const pages = getPages();
    savePages(Array.from(new Set([...pages, ...body.pages])));
  }
  saveExperiments(experiments);
  return Response.json(experiments[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: number };
  const experiments = getExperiments().filter((e) => e.id !== id);
  saveExperiments(experiments);
  return Response.json({ ok: true });
}
