import { z } from 'zod';
import { PIPELINE_STAGES } from './types';
import type { ExperimentStatus } from './types';

/**
 * Zod schemas validating API request bodies at the boundary.
 * All write payloads are partial: POST fills defaults, PUT merges into the
 * stored document server-side.
 */

const experimentStatus = z.enum(PIPELINE_STAGES as [ExperimentStatus, ...ExperimentStatus[]]);
const platform = z.enum(['Web-Mobile', 'Web-Desk', 'App-iOS', 'App-Android']);
const experimentResult = z.enum(['In Progress', 'Winner', 'Loser', 'Inconclusive', 'Stopped']);

const stageEntry = z.object({
  stage: experimentStatus,
  entered_at: z.string(),
  note: z.string(),
});

const metricRow = z.object({
  name: z.string(),
  kind: z.enum(['count', 'value']),
  values: z.array(z.number().nullable()),
});

const experimentResults = z.object({
  exposure_event: z.string(),
  variants: z.array(z.string()),
  exposures: z.array(z.number().nullable()),
  metrics: z.array(metricRow),
  notes: z.string(),
});

export const experimentInput = z.object({
  id: z.number().int(),
  test_id: z.string(),
  title: z.string(),
  status: experimentStatus,
  platform: z.array(platform),
  pages: z.array(z.string()),
  hypothesis: z.string(),
  problem_statement: z.string(),
  metrics: z.object({
    primary: z.string(),
    secondary: z.array(z.string()),
    guardrail: z.array(z.string()),
  }),
  result: experimentResult,
  revenue_impact: z.string().nullable(),
  creator: z.string(),
  stage_history: z.array(stageEntry),
  results: experimentResults,
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  duration_days: z.number().nullable(),
  remarks: z.string(),
  growthbook_id: z.string(),
  amaly_task_id: z.string(),
  source: z.enum(['self', 'inbox']),
  promoted_from_idea_id: z.number().nullable(),
  created_at: z.string(),
}).partial();

export const experimentUpdate = experimentInput.extend({ id: z.number().int() });

const taskStatus = z.enum(['Active', 'In Progress', 'Completed']);

export const taskInput = z.object({
  id: z.number().int(),
  title: z.string(),
  type: z.enum(['GA4 Report', 'Analysis', 'General', 'Other']),
  status: taskStatus,
  assigned_by: z.string().nullable(),
  subtasks: z.array(z.object({ id: z.number(), title: z.string(), status: taskStatus })),
  dependencies: z.array(z.string()).optional(),
  source: z.enum(['self', 'inbox']),
  promoted_from_idea_id: z.number().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
}).partial();

export const taskUpdate = taskInput.extend({ id: z.number().int() });

export const ideaInput = z.object({
  submitted_by: z.string(),
  title: z.string(),
  hypothesis: z.string(),
  platform: z.array(platform),
  pages: z.array(z.string()),
  type: z.enum(['experiment', 'task']),
}).partial();

export const ideaUpdate = ideaInput.extend({
  id: z.number().int(),
  action: z.enum(['approve', 'reject']).optional(),
});

export const deleteInput = z.object({ id: z.number().int() });

/**
 * Parse and validate a request body. Returns the typed data or a ready-made
 * 400 response (malformed JSON or schema violation).
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: Response.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { error: Response.json({ error: `Validation failed — ${detail}` }, { status: 400 }) };
  }
  return { data: parsed.data };
}

/** Normalize a date input to date-only form (YYYY-MM-DD); null passes through. */
export function toDateOnly(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.slice(0, 10);
}

/** Whole days between two date strings, or null when either is missing. */
export function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000);
}
