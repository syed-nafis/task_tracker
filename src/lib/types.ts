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
  revenue_impact: string | null;
  creator: string;
  baseline_data: string;
  current_data: string;
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
