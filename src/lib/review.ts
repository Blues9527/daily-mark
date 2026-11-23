import type { Block, Category, DayPlan, DayRecord, Task } from '../types';
import { blockMinutes, plannedMinutes } from './capacity';

const CATEGORIES: Category[] = ['create', 'talk', 'admin', 'life'];

function emptyCategories(): DayRecord['categories'] {
  return {
    create: { plannedMin: 0, actualMin: 0 },
    talk: { plannedMin: 0, actualMin: 0 },
    admin: { plannedMin: 0, actualMin: 0 },
    life: { plannedMin: 0, actualMin: 0 },
  };
}

function blockActual(block: Block): number {
  if (typeof block.actualMin === 'number') return block.actualMin;
  if (block.completion === 'done') return blockMinutes(block);
  return 0;
}

export function planTaskIds(plan: DayPlan): string[] {
  const ids = new Set<string>(plan.mitTaskIds);
  plan.blocks.forEach((block) => {
    if (block.taskId) ids.add(block.taskId);
  });
  return [...ids];
}

export function computeDayRecord(plan: DayPlan, tasks: Task[]): DayRecord {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const categories = emptyCategories();
  const plannedByCategory = new Map<Category, number>();
  const actualByCategory = new Map<Category, number>();
  const planIds = planTaskIds(plan);
  let actualMin = 0;

  plan.blocks.forEach((block) => {
    if (!block.taskId || (block.kind !== 'task' && block.kind !== 'ritual')) return;
    const task = taskMap.get(block.taskId);
    if (!task) return;
    const planMinutes = blockMinutes(block);
    const actual = blockActual(block);
    plannedByCategory.set(task.category, (plannedByCategory.get(task.category) ?? 0) + planMinutes);
    actualByCategory.set(task.category, (actualByCategory.get(task.category) ?? 0) + actual);
    actualMin += actual;
  });

  planIds.forEach((taskId) => {
    const task = taskMap.get(taskId);
    if (!task || !task.actualMin) return;
    const hasBlock = plan.blocks.some((block) => block.taskId === taskId && block.kind === 'task');
    if (hasBlock) return;
    actualByCategory.set(
      task.category,
      (actualByCategory.get(task.category) ?? 0) + task.actualMin,
    );
    actualMin += task.actualMin;
  });

  CATEGORIES.forEach((category) => {
    categories[category] = {
      plannedMin: plannedByCategory.get(category) ?? 0,
      actualMin: actualByCategory.get(category) ?? 0,
    };
  });

  const completedTasks = planIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return task?.status === 'done' || task?.status === 'partial';
  }).length;

  const planned = plannedMinutes(plan.blocks);
  return {
    date: plan.date,
    plannedMin: planned,
    actualMin,
    completedTasks,
    totalTasks: planIds.length,
    deepMin: categories.create.actualMin,
    fulfillment: planned > 0 ? Math.min(1, actualMin / planned) : 0,
    categories,
  };
}

export interface CapacitySuggestion {
  suggestedMin: number;
  reason: string;
}

export function suggestTomorrowCapacity(
  history: DayRecord[],
  currentCapacityMin: number,
  todayRecord?: DayRecord,
): CapacitySuggestion | null {
  const past = [...history].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  if (todayRecord) past.unshift(todayRecord);
  const samples = past.slice(0, 3);
  if (samples.length < 2) return null;

  const averageFulfillment =
    samples.reduce((total, record) => total + record.fulfillment, 0) / samples.length;
  if (averageFulfillment >= 0.85) return null;

  const suggested = Math.max(240, Math.round((currentCapacityMin - 60) / 30) * 30);
  return {
    suggestedMin: suggested,
    reason: `最近 ${samples.length} 次平均兑现 ${Math.round(averageFulfillment * 100)}%，先少排一点。`,
  };
}

export const REVIEW_REASONS = ['客户临时改需求', '低估了难度', '状态不好', '主动调整'];
