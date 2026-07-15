export type Platform = 'Web-Mobile' | 'Web-Desk' | 'App-iOS' | 'App-Android';

export type ExperimentStatus =
  | 'Idea'
  | 'Analysis'
  | 'PRD'
  | 'Growthbook Setup'
  | 'Amaly Task'
  | 'Implementation'
  | 'Deploy Local'
  | 'SQA'
  | 'Code Review'
  | 'Merge'
  | 'Staging (Club)'
  | 'Live'
  | 'Results Setup'
  | 'Monitoring'
  | 'Completed';

export const PIPELINE_STAGES: ExperimentStatus[] = [
  'Idea', 'Analysis', 'PRD', 'Growthbook Setup', 'Amaly Task',
  'Implementation', 'Deploy Local', 'SQA', 'Code Review', 'Merge',
  'Staging (Club)', 'Live', 'Results Setup', 'Monitoring', 'Completed',
];

export const PHASES: { name: string; stages: ExperimentStatus[] }[] = [
  { name: 'Planning', stages: ['Idea', 'Analysis', 'PRD'] },
  { name: 'Setup', stages: ['Growthbook Setup', 'Amaly Task'] },
  { name: 'Build', stages: ['Implementation', 'Deploy Local'] },
  { name: 'QA', stages: ['SQA'] },
  { name: 'Code Review', stages: ['Code Review', 'Merge', 'Staging (Club)'] },
  { name: 'Live', stages: ['Live', 'Results Setup', 'Monitoring'] },
  { name: 'Done', stages: ['Completed'] },
];

export interface StageEntry {
  stage: ExperimentStatus;
  entered_at: string; // ISO timestamp when the experiment entered this stage
  note: string; // per-stage note, editable after the fact
}

/**
 * Results matrix: variant columns × metric rows, anchored on an exposure event.
 * `kind: 'count'` metrics are event counts — rendered as rate vs exposures with
 * a two-proportion z-test vs control. `kind: 'value'` metrics are raw numbers
 * (e.g. AOV) — lift vs control only.
 */
export interface MetricRow {
  name: string; // e.g. 'add_to_cart', 'checkout', 'aov'
  kind: 'count' | 'value';
  values: (number | null)[]; // per variant, aligned with ExperimentResults.variants
}

export interface ExperimentResults {
  exposure_event: string; // participant definition, e.g. 'pdp_view'
  variants: string[]; // ['Control', 'Variant B', ...] — index 0 = control
  exposures: (number | null)[]; // participants per variant
  metrics: MetricRow[];
  notes: string;
}

export function emptyResults(): ExperimentResults {
  return {
    exposure_event: '',
    variants: ['Control', 'Variant B'],
    exposures: [null, null],
    metrics: [],
    notes: '',
  };
}

export type ExperimentResult = 'In Progress' | 'Winner' | 'Loser' | 'Inconclusive' | 'Stopped';

export interface Experiment {
  id: number;
  test_id: string;
  title: string;
  status: ExperimentStatus;
  platform: Platform[];
  pages: string[];
  hypothesis: string;
  problem_statement: string;
  metrics: {
    primary: string;
    secondary: string[];
    guardrail: string[];
  };
  result: ExperimentResult;
  ice_score: number | null;
  sprint: string | null;
  revenue_impact: string | null;
  creator: string;
  stage_history: StageEntry[];
  results: ExperimentResults;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  remarks: string;
  growthbook_id: string;
  amaly_task_id: string;
  source: 'self' | 'inbox';
  promoted_from_idea_id: number | null;
  created_at: string;
}

export type TaskStatus = 'Active' | 'In Progress' | 'Completed';
export type TaskType = 'GA4 Report' | 'Analysis' | 'General' | 'Other';

export interface Subtask {
  id: number;
  title: string;
  status: TaskStatus;
}

export interface Task {
  id: number;
  title: string;
  type: TaskType;
  status: TaskStatus;
  assigned_by: string | null;
  subtasks: Subtask[];
  dependencies?: string[];
  source: 'self' | 'inbox';
  promoted_from_idea_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export type IdeaStatus = 'Pending' | 'Approved' | 'Rejected';
export type IdeaType = 'experiment' | 'task';

export interface Idea {
  id: number;
  submitted_by: string;
  title: string;
  hypothesis: string;
  platform: Platform[];
  pages: string[];
  type: IdeaType;
  status: IdeaStatus;
  promoted: boolean;
  promoted_to_id: number | null;
  created_at: string;
}

export interface DB {
  experiments: Experiment[];
  tasks: Task[];
  ideas: Idea[];
  pages: string[];
}
