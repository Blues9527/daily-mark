export type Category = 'create' | 'talk' | 'admin' | 'life';
export type Energy = 'high' | 'mid' | 'low';
export type TaskStatus = 'inbox' | 'planned' | 'active' | 'done' | 'partial' | 'moved';
export type BlockKind = 'task' | 'break' | 'buffer' | 'ritual';
export type Completion = 'done' | 'partial' | 'missed';
export type DistractionType = 'idea' | 'todo' | 'feeling';
export type ScreenId = 'today' | 'collect' | 'plan' | 'focus' | 'review' | 'stats';

export interface Task {
  id: string;
  title: string;
  estimateMin: number;
  energy: Energy;
  category: Category;
  status: TaskStatus;
  createdAt: string;
  actualMin?: number;
  completedAt?: string;
}

export interface Block {
  id: string;
  taskId?: string;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
  kind: BlockKind;
  locked?: boolean;
  optional?: boolean;
  countsTowardCapacity?: boolean;
  actualMin?: number;
  completion?: Completion;
  movedFrom?: { date: string; startMin: number };
}

export interface DayPlan {
  date: string;
  capacityMin: number;
  bufferRatio: number;
  mitTaskIds: string[];
  blocks: Block[];
}

export interface Review {
  date: string;
  reasons: string[];
  note: string;
  tomorrowCapacityMin: number | null;
  acceptedSuggestion: boolean;
  completedAt: string;
}

export interface CategoryMinutes {
  plannedMin: number;
  actualMin: number;
}

export interface DayRecord {
  date: string;
  plannedMin: number;
  actualMin: number;
  completedTasks: number;
  totalTasks: number;
  deepMin: number;
  fulfillment: number;
  categories: Record<Category, CategoryMinutes>;
}

export interface Distraction {
  id: string;
  text: string;
  type: DistractionType;
  createdAt: string;
  blockId?: string;
  handled?: boolean;
}

export interface Settings {
  name: string;
  dayStartMin: number;
  dayEndMin: number;
  capacityMin: number;
  bufferRatio: number;
  defaultEstimateMin: number;
}

export interface FocusSession {
  blockId: string;
  date: string;
  startedAt: string | null;
  accumulatedSec: number;
  paused: boolean;
  pausedAt: string | null;
}

export interface AppState {
  version: 1;
  tasks: Task[];
  plans: Record<string, DayPlan>;
  reviews: Record<string, Review>;
  history: DayRecord[];
  distractions: Distraction[];
  settings: Settings;
  streak: number;
  lastRecordedDate: string | null;
  tomorrowCapacityMin: number | null;
  focus: FocusSession | null;
  distractionsHandledAt?: string | null;
}

export interface NewTaskInput {
  title: string;
  estimateMin?: number;
  category?: Category;
  energy?: Energy;
}

export interface ReviewInput {
  reasons: string[];
  note: string;
  acceptedSuggestion: boolean;
  tomorrowCapacityMin: number | null;
}

export interface CapacityStatus {
  capacityMin: number;
  plannedMin: number;
  remainingMin: number;
  overMin: number;
  ratio: number;
}
