import { describe, expect, it } from 'vitest';
import type { Block, DayRecord, FocusSession, Task } from '../types';
import { addDays, dateKey, lastNDays } from './date';
import {
  capacityStatus,
  countsTowardCapacity,
  plannedMinutes,
  trimCandidates,
} from './capacity';
import {
  buildSmartSchedule,
  findFreeSlot,
  sortTasksForSchedule,
} from './schedule';
import { computeDayRecord, suggestTomorrowCapacity } from './review';
import { focusElapsedSeconds, focusRemainingSeconds, formatClock } from './focus';
import { formatDuration, formatHours, minutesToTime, timeToMinutes } from './format';
import { computeDashboard } from './stats';
import { createSeedState } from '../data/seed';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    estimateMin: 30,
    energy: 'mid',
    category: 'create',
    status: 'planned',
    createdAt: '2026-11-23T08:00:00.000Z',
    ...partial,
  };
}

function block(partial: Partial<Block> & Pick<Block, 'id' | 'title' | 'startMin' | 'endMin'>): Block {
  return {
    date: '2026-11-23',
    kind: 'task',
    ...partial,
  };
}

function record(date: string, fulfillment: number): DayRecord {
  return {
    date,
    plannedMin: 360,
    actualMin: Math.round(360 * fulfillment),
    completedTasks: 3,
    totalTasks: 6,
    deepMin: 120,
    fulfillment,
    categories: {
      create: { plannedMin: 240, actualMin: 160 },
      talk: { plannedMin: 60, actualMin: 70 },
      admin: { plannedMin: 30, actualMin: 20 },
      life: { plannedMin: 30, actualMin: 20 },
    },
  };
}

describe('format and date helpers', () => {
  it('formats times and durations', () => {
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(1265)).toBe('21:05');
    expect(timeToMinutes('21:05')).toBe(1265);
    expect(formatDuration(90)).toBe('1.5h');
    expect(formatDuration(75)).toBe('75m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatHours(445)).toBe('7.4');
  });

  it('moves between local date keys', () => {
    const date = new Date(2026, 10, 23);
    expect(dateKey(date)).toBe('2026-11-23');
    expect(addDays('2026-11-23', 1)).toBe('2026-11-24');
    expect(lastNDays('2026-11-23', 7)).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
  });
});

describe('capacity model', () => {
  it('counts only committed blocks', () => {
    const blocks = [
      block({ id: 'a', title: '创作', startMin: 540, endMin: 630 }),
      block({ id: 'b', title: '复盘', startMin: 1260, endMin: 1290, kind: 'ritual' }),
      block({ id: 'c', title: '午餐', startMin: 720, endMin: 810, kind: 'break', countsTowardCapacity: false }),
      block({ id: 'd', title: '留白', startMin: 1020, endMin: 1200, kind: 'buffer' }),
    ];
    expect(countsTowardCapacity(blocks[0])).toBe(true);
    expect(countsTowardCapacity(blocks[1])).toBe(true);
    expect(countsTowardCapacity(blocks[2])).toBe(false);
    expect(plannedMinutes(blocks)).toBe(120);
    const status = capacityStatus(blocks, 90);
    expect(status.overMin).toBe(30);
    expect(status.remainingMin).toBe(0);
  });

  it('suggests removing optional blocks from the latest first', () => {
    const blocks = [
      block({ id: 'a', title: '核心任务', startMin: 540, endMin: 630 }),
      block({ id: 'b', title: '行政', startMin: 900, endMin: 940, optional: true }),
      block({ id: 'c', title: '课程', startMin: 1200, endMin: 1260, optional: true }),
    ];
    expect(plannedMinutes(blocks)).toBe(190);
    expect(trimCandidates(blocks, 120)).toEqual(['c', 'b']);
    expect(trimCandidates(blocks, 200)).toEqual([]);
  });
});

describe('smart scheduling', () => {
  const tasks = [
    task({ id: 't1', title: '主视觉', estimateMin: 90, energy: 'high' }),
    task({ id: 't2', title: '提案', estimateMin: 75, energy: 'mid', category: 'talk' }),
    task({ id: 't3', title: '邮件', estimateMin: 20, energy: 'low', category: 'talk' }),
  ];

  it('schedules tasks, protects lunch, and creates a buffer', () => {
    const result = buildSmartSchedule({
      date: '2026-11-23',
      tasks,
      dayStartMin: 540,
      dayEndMin: 1290,
      capacityMin: 360,
      bufferRatio: 0.2,
    });
    expect(result.scheduledTaskIds).toHaveLength(3);
    expect(result.unscheduledTaskIds).toHaveLength(0);
    expect(result.plannedMin).toBe(185);
    expect(result.blocks.some((item) => item.kind === 'break')).toBe(true);
    expect(result.blocks.some((item) => item.kind === 'buffer')).toBe(true);
    expect(result.blocks.some((item) => item.kind === 'ritual')).toBe(true);
    const lunch = result.blocks.find((item) => item.kind === 'break');
    expect(lunch?.startMin).toBe(720);
    expect(lunch?.endMin).toBe(810);
    const overlap = result.blocks.some((item, index) =>
      result.blocks.slice(index + 1).some(
        (other) => item.startMin < other.endMin && other.startMin < item.endMin,
      ),
    );
    expect(overlap).toBe(false);
  });

  it('leaves tasks unscheduled when capacity is exhausted', () => {
    const result = buildSmartSchedule({
      date: '2026-11-23',
      tasks,
      dayStartMin: 540,
      dayEndMin: 1290,
      capacityMin: 100,
      bufferRatio: 0.2,
    });
    expect(result.scheduledTaskIds).toEqual(['t1']);
    expect(result.unscheduledTaskIds).toEqual(['t2', 't3']);
    expect(result.plannedMin).toBe(90);
  });

  it('orders high energy first while preserving input order inside a tier', () => {
    const ordered = sortTasksForSchedule([
      task({ id: 'low', title: '低', energy: 'low' }),
      task({ id: 'high1', title: '高1', energy: 'high' }),
      task({ id: 'high2', title: '高2', energy: 'high' }),
    ]);
    expect(ordered.map((item) => item.id)).toEqual(['high1', 'high2', 'low']);
  });

  it('finds gaps around fixed blocks', () => {
    const blocks = [block({ id: 'lunch', title: '午餐', startMin: 720, endMin: 810, kind: 'break' })];
    expect(findFreeSlot(blocks, '2026-11-23', 60, 540, 1290)?.startMin).toBe(540);
    expect(findFreeSlot(blocks, '2026-11-23', 60, 700, 1290)?.startMin).toBe(810);
    expect(findFreeSlot(blocks, '2026-11-23', 60, 760, 850)).toBeNull();
  });
});

describe('review and suggestions', () => {
  it('computes fulfillment, completion, and category actuals', () => {
    const tasks = [
      task({ id: 'a', title: '创作', estimateMin: 90, category: 'create', status: 'done', actualMin: 80 }),
      task({ id: 'b', title: '沟通', estimateMin: 30, category: 'talk', status: 'partial', actualMin: 20 }),
      task({ id: 'c', title: '回复', estimateMin: 20, category: 'talk', status: 'done', actualMin: 22 }),
    ];
    const plan = {
      date: '2026-11-23',
      capacityMin: 360,
      bufferRatio: 0.2,
      mitTaskIds: ['a', 'b', 'c'],
      blocks: [
        block({ id: 'ba', title: '创作', taskId: 'a', startMin: 540, endMin: 630, actualMin: 80, completion: 'done' }),
        block({ id: 'bb', title: '沟通', taskId: 'b', startMin: 660, endMin: 690, actualMin: 20, completion: 'partial' }),
      ],
    };
    const day = computeDayRecord(plan, tasks);
    expect(day.plannedMin).toBe(120);
    expect(day.actualMin).toBe(122);
    expect(day.completedTasks).toBe(3);
    expect(day.totalTasks).toBe(3);
    expect(day.fulfillment).toBe(1);
    expect(day.categories.create.actualMin).toBe(80);
    expect(day.categories.talk.actualMin).toBe(42);
  });

  it('suggests a lower capacity only when recent fulfillment is weak', () => {
    expect(
      suggestTomorrowCapacity(
        [record('2026-11-20', 0.7), record('2026-11-21', 0.72), record('2026-11-22', 0.75)],
        360,
      )?.suggestedMin,
    ).toBe(300);
    expect(
      suggestTomorrowCapacity(
        [record('2026-11-20', 0.95), record('2026-11-21', 0.92)],
        360,
      ),
    ).toBeNull();
  });
});

describe('focus timer', () => {
  const session: FocusSession = {
    blockId: 'b',
    date: '2026-11-23',
    startedAt: '2026-11-23T10:00:00.000Z',
    accumulatedSec: 30,
    paused: false,
    pausedAt: null,
  };

  it('accumulates running and paused time', () => {
    const now = new Date('2026-11-23T10:01:00.000Z');
    expect(focusElapsedSeconds(session, now)).toBe(90);
    expect(focusRemainingSeconds(session, now, 2)).toBe(30);
    expect(
      focusElapsedSeconds({ ...session, startedAt: null, paused: true }, now),
    ).toBe(30);
    expect(formatClock(2538)).toBe('42:18');
  });
});

describe('dashboard integration with seed', () => {
  const state = createSeedState('2026-11-23');
  const plan = state.plans['2026-11-23'];
  const dashboard = computeDashboard(state, plan, state.tasks, '2026-11-23');

  it('produces a seven-day window and fourteen-day calendar', () => {
    expect(dashboard.weekly).toHaveLength(7);
    expect(dashboard.calendar).toHaveLength(14);
    expect(dashboard.streak).toBe(12);
    expect(dashboard.weekFocusMin).toBeGreaterThan(0);
    expect(dashboard.mostOverCategory).toBe('talk');
    expect(dashboard.recordedDays).toBe(13);
  });
});
