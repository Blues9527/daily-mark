import type { Block, Task } from '../types';
import { plannedMinutes, sortBlocks } from './capacity';

export interface SmartScheduleInput {
  date: string;
  tasks: Task[];
  dayStartMin: number;
  dayEndMin: number;
  capacityMin: number;
  bufferRatio: number;
  lunchStartMin?: number;
  lunchEndMin?: number;
  includeReview?: boolean;
  reviewStartMin?: number;
}

export interface SmartScheduleResult {
  blocks: Block[];
  scheduledTaskIds: string[];
  unscheduledTaskIds: string[];
  plannedMin: number;
  bufferMin: number;
}

export interface FreeSlot {
  startMin: number;
  endMin: number;
}

const ENERGY_ORDER: Record<Task['energy'], number> = { high: 0, mid: 1, low: 2 };

export function sortTasksForSchedule(tasks: Task[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const energy = ENERGY_ORDER[a.task.energy] - ENERGY_ORDER[b.task.energy];
      if (energy !== 0) return energy;
      return a.index - b.index;
    })
    .map((entry) => entry.task);
}

function makeBlock(partial: Omit<Block, 'id'> & { id?: string }): Block {
  return {
    ...partial,
    id: partial.id ?? `block-${partial.startMin}-${partial.endMin}-${partial.title}`,
  };
}

export function buildSmartSchedule(input: SmartScheduleInput): SmartScheduleResult {
  const {
    date,
    tasks,
    dayStartMin,
    dayEndMin,
    capacityMin,
    lunchStartMin = 12 * 60,
    lunchEndMin = 13 * 60 + 30,
    includeReview = true,
    reviewStartMin = 21 * 60,
  } = input;

  const blocks: Block[] = [];
  const scheduledTaskIds: string[] = [];
  const unscheduledTaskIds: string[] = [];
  const timedTasks = sortTasksForSchedule(tasks.filter((task) => task.status !== 'done'));

  if (dayStartMin < lunchStartMin && dayEndMin > lunchStartMin) {
    const lunchEnd = Math.min(lunchEndMin, dayEndMin);
    blocks.push(
      makeBlock({
        id: `lunch-${date}`,
        title: '午餐 · 散步',
        date,
        startMin: lunchStartMin,
        endMin: lunchEnd,
        kind: 'break',
        countsTowardCapacity: false,
        locked: true,
      }),
    );
  }

  let cursor = dayStartMin;
  let planned = 0;

  for (const task of timedTasks) {
    const duration = Math.max(5, task.estimateMin);
    if (planned + duration > capacityMin) {
      unscheduledTaskIds.push(task.id);
      continue;
    }

    let start = findFreeSlot(blocks, date, duration, cursor, dayEndMin)?.startMin ?? null;
    if (start === null && cursor > dayStartMin) {
      start = findFreeSlot(blocks, date, duration, dayStartMin, dayEndMin)?.startMin ?? null;
    }
    if (start === null) {
      unscheduledTaskIds.push(task.id);
      continue;
    }

    const end = start + duration;
    blocks.push(
      makeBlock({
        id: `task-${task.id}-${start}`,
        taskId: task.id,
        title: task.title,
        date,
        startMin: start,
        endMin: end,
        kind: 'task',
        countsTowardCapacity: true,
      }),
    );
    scheduledTaskIds.push(task.id);
    planned += duration;
    cursor = end;
  }

  const lastTaskEnd = blocks
    .filter((block) => block.kind === 'task')
    .reduce((latest, block) => Math.max(latest, block.endMin), dayStartMin);
  const bufferMin = Math.max(0, capacityMin - planned);
  const bufferStart = Math.max(lastTaskEnd, lunchEndMin);
  const reviewStart = includeReview && dayEndMin >= reviewStartMin + 30 ? reviewStartMin : null;
  const bufferEnd = Math.min(bufferStart + bufferMin, reviewStart ?? dayEndMin, dayEndMin);

  if (bufferMin >= 15 && bufferEnd - bufferStart >= 15) {
    blocks.push(
      makeBlock({
        id: `buffer-${date}`,
        title: '留白 · 不排事',
        date,
        startMin: bufferStart,
        endMin: bufferEnd,
        kind: 'buffer',
        countsTowardCapacity: false,
        locked: true,
      }),
    );
  }

  if (reviewStart !== null) {
    blocks.push(
      makeBlock({
        id: `review-${date}`,
        title: '今日复盘',
        date,
        startMin: reviewStart,
        endMin: reviewStart + 30,
        kind: 'ritual',
        countsTowardCapacity: false,
        locked: true,
      }),
    );
  }

  return {
    blocks: sortBlocks(blocks),
    scheduledTaskIds,
    unscheduledTaskIds,
    plannedMin: plannedMinutes(blocks),
    bufferMin: Math.max(0, capacityMin - planned),
  };
}

export function findFreeSlot(
  blocks: Block[],
  date: string,
  durationMin: number,
  fromMin: number,
  untilMin: number,
  ignoreBlockId?: string,
): FreeSlot | null {
  const busy = blocks
    .filter((block) => block.date === date && block.id !== ignoreBlockId)
    .sort((a, b) => a.startMin - b.startMin);

  let cursor = fromMin;
  for (const block of busy) {
    if (block.endMin <= cursor) continue;
    if (block.startMin >= untilMin) break;
    if (block.startMin - cursor >= durationMin) {
      return { startMin: cursor, endMin: cursor + durationMin };
    }
    cursor = Math.max(cursor, block.endMin);
    if (cursor + durationMin > untilMin) return null;
  }
  if (cursor + durationMin <= untilMin) {
    return { startMin: cursor, endMin: cursor + durationMin };
  }
  return null;
}

export function rescheduleBlock(
  blocks: Block[],
  blockId: string,
  dayEndMin: number,
): Block[] | null {
  const target = blocks.find((block) => block.id === blockId);
  if (!target) return null;
  const duration = Math.max(5, target.endMin - target.startMin);
  const slot = findFreeSlot(
    blocks,
    target.date,
    duration,
    target.startMin + 15,
    dayEndMin,
    target.id,
  );
  if (!slot) return null;
  return sortBlocks(
    blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            startMin: slot.startMin,
            endMin: slot.endMin,
            movedFrom: block.movedFrom ?? { date: block.date, startMin: block.startMin },
          }
        : block,
    ),
  );
}

export function findCurrentBlock(blocks: Block[], nowMin: number, date: string): Block | null {
  const todayBlocks = blocks.filter((block) => block.date === date && block.kind !== 'buffer');
  return (
    todayBlocks.find((block) => block.startMin <= nowMin && block.endMin > nowMin) ?? null
  );
}

export function findNextBlock(blocks: Block[], nowMin: number, date: string): Block | null {
  return (
    blocks
      .filter(
        (block) =>
          block.date === date &&
          block.startMin > nowMin &&
          (block.kind === 'task' || block.kind === 'ritual'),
      )
      .sort((a, b) => a.startMin - b.startMin)[0] ?? null
  );
}

export function findCurrentTaskBlock(blocks: Block[], nowMin: number, date: string): Block | null {
  const current = findCurrentBlock(blocks, nowMin, date);
  if (current?.kind === 'task') return current;
  return null;
}

export function overdueBlocks(blocks: Block[], nowMin: number, date: string): Block[] {
  return blocks.filter(
    (block) =>
      block.date === date &&
      block.kind === 'task' &&
      block.endMin <= nowMin &&
      !block.completion,
  );
}

export function blockDuration(block: Block): number {
  return Math.max(0, block.endMin - block.startMin);
}
