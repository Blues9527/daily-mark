const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  pad2,
  dateKey,
  parseDateKey,
  addDays,
  weekdayCN,
  dateLabel,
  nowMinutes,
  startOfWeek,
  weekKeys,
  lastNDays,
} = require('../utils/date');
const {
  minutesToTime,
  timeToMinutes,
  formatDuration,
  formatHours,
  formatPercent,
  formatMinutesLabel,
  clamp,
} = require('../utils/format');
const {
  blockMinutes,
  countsTowardCapacity,
  plannedMinutes,
  capacityStatus,
  trimCandidates,
  sortBlocks,
  blockLabel,
} = require('../utils/capacity');
const {
  buildSmartSchedule,
  findFreeSlot,
  rescheduleBlock,
  findCurrentBlock,
  findNextBlock,
  findCurrentTaskBlock,
  overdueBlocks,
  sortTasksForSchedule,
  blockDuration,
} = require('../utils/schedule');
const {
  planTaskIds,
  computeDayRecord,
  suggestTomorrowCapacity,
  REVIEW_REASONS,
} = require('../utils/review');
const { computeDashboard } = require('../utils/stats');
const {
  focusElapsedSeconds,
  focusRemainingSeconds,
  focusProgress,
  formatClock,
} = require('../utils/focus');
const { makeId } = require('../utils/id');
const { createSeedState, createEmptyPlan, todayKey } = require('../utils/seed');

function task(partial) {
  return Object.assign(
    {
      estimateMin: 30,
      energy: 'mid',
      category: 'create',
      status: 'planned',
      createdAt: '2026-11-23T08:00:00.000Z',
    },
    partial,
  );
}

function block(partial) {
  return Object.assign(
    {
      date: '2026-11-23',
      kind: 'task',
    },
    partial,
  );
}

function record(date, fulfillment) {
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

test('date keys and day arithmetic stay on local time', () => {
  assert.equal(pad2(7), '07');
  assert.equal(dateKey(new Date(2026, 10, 23)), '2026-11-23');
  assert.equal(dateKey(parseDateKey('2026-11-23')), '2026-11-23');
  assert.equal(addDays('2026-11-23', 1), '2026-11-24');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.deepEqual(lastNDays('2026-11-23', 7), [
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
    '2026-11-23',
  ]);
});

test('weekday labels, minute of day, and week start match the H5 helpers', () => {
  const date = new Date(2026, 10, 23, 10, 12);
  assert.equal(weekdayCN(date), '周一');
  assert.equal(dateLabel(date), '11 月 23 日 · 周一');
  assert.equal(nowMinutes(date), 612);
  assert.equal(startOfWeek('2026-11-23'), '2026-11-23');
  assert.equal(startOfWeek('2026-11-29'), '2026-11-23');
  assert.deepEqual(weekKeys('2026-11-25'), lastNDays('2026-11-29', 7));
});

test('time and duration formatting clamps and rounds', () => {
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(minutesToTime(1265), '21:05');
  assert.equal(minutesToTime(-20), '00:00');
  assert.equal(minutesToTime(1500), '23:59');
  assert.equal(timeToMinutes('21:05'), 1265);
  assert.equal(timeToMinutes('9:05'), 545);
  assert.equal(timeToMinutes('08:00'), 480);
  assert.equal(formatDuration(90), '1.5h');
  assert.equal(formatDuration(75), '75m');
  assert.equal(formatDuration(120), '2h');
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatHours(445), '7.4');
  assert.equal(formatHours(420), '7');
  assert.equal(formatMinutesLabel(90), '1.5h');
  assert.equal(formatMinutesLabel(45), '45m');
});

test('percent and clamp helpers guard their bounds', () => {
  assert.equal(formatPercent(0.523), '52%');
  assert.equal(formatPercent(1.4), '100%');
  assert.equal(formatPercent(-0.2), '0%');
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('capacity counts task and ritual blocks', () => {
  const blocks = [
    block({ id: 'a', title: '创作', startMin: 540, endMin: 630 }),
    block({ id: 'b', title: '复盘', startMin: 1260, endMin: 1290, kind: 'ritual' }),
    block({
      id: 'c',
      title: '午餐',
      startMin: 720,
      endMin: 810,
      kind: 'break',
      countsTowardCapacity: false,
    }),
    block({ id: 'd', title: '留白', startMin: 1020, endMin: 1200, kind: 'buffer' }),
  ];
  assert.equal(blockMinutes(blocks[0]), 90);
  assert.equal(countsTowardCapacity(blocks[0]), true);
  assert.equal(countsTowardCapacity(blocks[1]), true);
  assert.equal(countsTowardCapacity(blocks[2]), false);
  assert.equal(countsTowardCapacity(blocks[3]), false);
  assert.equal(plannedMinutes(blocks), 120);
  const status = capacityStatus(blocks, 90);
  assert.equal(status.capacityMin, 90);
  assert.equal(status.plannedMin, 120);
  assert.equal(status.overMin, 30);
  assert.equal(status.remainingMin, 0);
  assert.equal(status.ratio, 120 / 90);
});

test('trim removes optional blocks from the latest first', () => {
  const blocks = [
    block({ id: 'core', title: '核心任务', startMin: 540, endMin: 630 }),
    block({ id: 'admin', title: '行政', startMin: 900, endMin: 940, optional: true }),
    block({ id: 'course', title: '课程', startMin: 1200, endMin: 1260, optional: true }),
  ];
  assert.equal(plannedMinutes(blocks), 190);
  assert.deepEqual(trimCandidates(blocks, 120), ['course', 'admin']);
  assert.deepEqual(trimCandidates(blocks, 200), []);
  const sorted = sortBlocks([
    block({ id: 'late', title: '晚', startMin: 900, endMin: 940 }),
    block({ id: 'early-long', title: '早长', startMin: 540, endMin: 630 }),
    block({ id: 'early-short', title: '早短', startMin: 540, endMin: 600 }),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ['early-short', 'early-long', 'late']);
  assert.equal(blockLabel({ kind: 'buffer' }), '留白');
  assert.equal(blockLabel({ kind: 'ritual' }), '仪式');
  assert.equal(blockLabel({ kind: 'break' }), '休息');
  assert.equal(blockLabel({ kind: 'task' }), '任务');
});

test('smart scheduling protects lunch, buffers slack, and adds the review ritual', () => {
  const tasks = [
    task({ id: 't1', title: '主视觉', estimateMin: 90, energy: 'high' }),
    task({ id: 't2', title: '提案', estimateMin: 75, energy: 'mid', category: 'talk' }),
    task({ id: 't3', title: '邮件', estimateMin: 20, energy: 'low', category: 'talk' }),
  ];
  const result = buildSmartSchedule({
    date: '2026-11-23',
    tasks,
    dayStartMin: 540,
    dayEndMin: 1290,
    capacityMin: 360,
    bufferRatio: 0.2,
  });
  assert.deepEqual(result.scheduledTaskIds, ['t1', 't2', 't3']);
  assert.deepEqual(result.unscheduledTaskIds, []);
  assert.equal(result.plannedMin, 185);
  assert.equal(result.bufferMin, 175);
  const lunch = result.blocks.find((item) => item.kind === 'break');
  assert.equal(lunch.startMin, 720);
  assert.equal(lunch.endMin, 810);
  const buffer = result.blocks.find((item) => item.kind === 'buffer');
  assert.equal(buffer.startMin, 830);
  assert.equal(buffer.endMin, 1005);
  assert.ok(result.blocks.some((item) => item.kind === 'ritual'));
  const taskBlocks = result.blocks.filter((item) => item.kind === 'task');
  assert.deepEqual(
    taskBlocks.map((item) => [item.startMin, item.endMin]),
    [
      [540, 630],
      [630, 705],
      [810, 830],
    ],
  );
  taskBlocks.forEach((item) => {
    assert.ok(item.endMin <= 720 || item.startMin >= 810);
  });
  const overlap = result.blocks.some((item, index) =>
    result.blocks
      .slice(index + 1)
      .some((other) => item.startMin < other.endMin && other.startMin < item.endMin),
  );
  assert.equal(overlap, false);
});

test('smart scheduling leaves overflow tasks unscheduled', () => {
  const tasks = [
    task({ id: 't1', title: '主视觉', estimateMin: 90, energy: 'high' }),
    task({ id: 't2', title: '提案', estimateMin: 75, energy: 'mid', category: 'talk' }),
    task({ id: 't3', title: '邮件', estimateMin: 20, energy: 'low', category: 'talk' }),
  ];
  const result = buildSmartSchedule({
    date: '2026-11-23',
    tasks,
    dayStartMin: 540,
    dayEndMin: 1290,
    capacityMin: 100,
    bufferRatio: 0.2,
  });
  assert.deepEqual(result.scheduledTaskIds, ['t1']);
  assert.deepEqual(result.unscheduledTaskIds, ['t2', 't3']);
  assert.equal(result.plannedMin, 90);
  assert.equal(result.blocks.some((item) => item.kind === 'buffer'), false);
});

test('tasks are ordered by energy while keeping input order inside a tier', () => {
  const ordered = sortTasksForSchedule([
    task({ id: 'low', title: '低', energy: 'low' }),
    task({ id: 'high1', title: '高1', energy: 'high' }),
    task({ id: 'high2', title: '高2', energy: 'high' }),
    task({ id: 'mid', title: '中', energy: 'mid' }),
  ]);
  assert.deepEqual(ordered.map((item) => item.id), ['high1', 'high2', 'mid', 'low']);
});

test('findFreeSlot skips fixed blocks and rejects tight windows', () => {
  const blocks = [
    block({ id: 'lunch', title: '午餐', startMin: 720, endMin: 810, kind: 'break' }),
  ];
  assert.deepEqual(findFreeSlot(blocks, '2026-11-23', 60, 540, 1290), {
    startMin: 540,
    endMin: 600,
  });
  assert.equal(findFreeSlot(blocks, '2026-11-23', 60, 700, 1290).startMin, 810);
  assert.equal(findFreeSlot(blocks, '2026-11-23', 60, 760, 850), null);
  assert.equal(findFreeSlot(blocks, '2026-11-24', 60, 540, 1290).startMin, 540);
});

test('rescheduleBlock moves a block later and records movedFrom', () => {
  const blocks = [
    block({ id: 'a', title: '创作', startMin: 540, endMin: 630 }),
    block({ id: 'lunch', title: '午餐', startMin: 720, endMin: 810, kind: 'break' }),
  ];
  const moved = rescheduleBlock(blocks, 'a', 1290);
  assert.ok(moved);
  const target = moved.find((item) => item.id === 'a');
  assert.equal(target.startMin, 555);
  assert.equal(target.endMin, 645);
  assert.deepEqual(target.movedFrom, { date: '2026-11-23', startMin: 540 });
  assert.equal(blocks.find((item) => item.id === 'a').startMin, 540);
  assert.equal(rescheduleBlock(blocks, 'missing', 1290), null);
});

test('current, next, and overdue block lookups follow the H5 rules', () => {
  const blocks = [
    block({ id: 'task-now', title: '写', startMin: 540, endMin: 630 }),
    block({ id: 'buffer', title: '留白', startMin: 600, endMin: 700, kind: 'buffer' }),
    block({ id: 'task-next', title: '沟通', startMin: 900, endMin: 960 }),
    block({ id: 'ritual', title: '复盘', startMin: 1260, endMin: 1290, kind: 'ritual' }),
  ];
  assert.equal(findCurrentBlock(blocks, 600, '2026-11-23').id, 'task-now');
  assert.equal(findCurrentBlock(blocks, 650, '2026-11-23'), null);
  assert.equal(findCurrentBlock(blocks, 1265, '2026-11-23').id, 'ritual');
  assert.equal(findCurrentTaskBlock(blocks, 1265, '2026-11-23'), null);
  assert.equal(findNextBlock(blocks, 600, '2026-11-23').id, 'task-next');
  assert.deepEqual(
    overdueBlocks(blocks, 1000, '2026-11-23').map((item) => item.id),
    ['task-now', 'task-next'],
  );
  const done = blocks.map((item) =>
    item.id === 'task-now' ? Object.assign({}, item, { completion: 'done' }) : item,
  );
  assert.deepEqual(
    overdueBlocks(done, 1000, '2026-11-23').map((item) => item.id),
    ['task-next'],
  );
});

test('computeDayRecord includes task and ritual blocks and computes fulfillment', () => {
  const tasks = [
    task({
      id: 'a',
      title: '创作',
      estimateMin: 90,
      category: 'create',
      status: 'done',
      actualMin: 80,
    }),
    task({
      id: 'b',
      title: '沟通',
      estimateMin: 30,
      category: 'talk',
      status: 'partial',
      actualMin: 20,
    }),
    task({
      id: 'c',
      title: '回复',
      estimateMin: 20,
      category: 'talk',
      status: 'done',
      actualMin: 22,
    }),
    task({ id: 'r', title: '复盘', estimateMin: 30, category: 'admin', status: 'planned' }),
  ];
  const plan = {
    date: '2026-11-23',
    capacityMin: 360,
    bufferRatio: 0.2,
    mitTaskIds: ['a', 'b', 'c'],
    blocks: [
      block({
        id: 'ba',
        title: '创作',
        taskId: 'a',
        startMin: 540,
        endMin: 630,
        actualMin: 80,
        completion: 'done',
      }),
      block({
        id: 'bb',
        title: '沟通',
        taskId: 'b',
        startMin: 660,
        endMin: 690,
        actualMin: 20,
        completion: 'partial',
      }),
      block({ id: 'br', title: '复盘', taskId: 'r', startMin: 1260, endMin: 1290, kind: 'ritual' }),
    ],
  };
  assert.deepEqual(planTaskIds(plan), ['a', 'b', 'c', 'r']);
  const day = computeDayRecord(plan, tasks);
  assert.equal(day.plannedMin, 150);
  assert.equal(day.actualMin, 122);
  assert.equal(day.completedTasks, 3);
  assert.equal(day.totalTasks, 4);
  assert.equal(day.deepMin, 80);
  assert.equal(day.fulfillment, 122 / 150);
  assert.equal(day.categories.create.plannedMin, 90);
  assert.equal(day.categories.create.actualMin, 80);
  assert.equal(day.categories.talk.plannedMin, 30);
  assert.equal(day.categories.talk.actualMin, 42);
  assert.equal(day.categories.admin.plannedMin, 30);
  assert.equal(day.categories.admin.actualMin, 0);
  assert.deepEqual(REVIEW_REASONS, ['客户临时改需求', '低估了难度', '状态不好', '主动调整']);
});

test('suggestTomorrowCapacity only lowers capacity after weak fulfillment', () => {
  const weak = suggestTomorrowCapacity(
    [record('2026-11-20', 0.7), record('2026-11-21', 0.72), record('2026-11-22', 0.75)],
    360,
  );
  assert.ok(weak);
  assert.equal(weak.suggestedMin, 300);
  assert.equal(weak.reason, '最近 3 次平均兑现 72%，先少排一点。');
  assert.equal(
    suggestTomorrowCapacity([record('2026-11-20', 0.95), record('2026-11-21', 0.92)], 360),
    null,
  );
  assert.equal(suggestTomorrowCapacity([record('2026-11-22', 0.7)], 360), null);
  const withToday = suggestTomorrowCapacity(
    [record('2026-11-21', 0.7), record('2026-11-22', 0.7)],
    360,
    record('2026-11-23', 0.7),
  );
  assert.ok(withToday);
  assert.equal(withToday.suggestedMin, 300);
});

test('focus timer accumulates, pauses, and formats the clock', () => {
  const session = {
    blockId: 'b',
    date: '2026-11-23',
    startedAt: '2026-11-23T10:00:00.000Z',
    accumulatedSec: 30,
    paused: false,
    pausedAt: null,
  };
  const now = new Date('2026-11-23T10:01:00.000Z');
  assert.equal(focusElapsedSeconds(session, now), 90);
  assert.equal(focusRemainingSeconds(session, now, 2), 30);
  assert.equal(focusProgress(session, now, 2), 0.75);
  assert.equal(
    focusElapsedSeconds(Object.assign({}, session, { startedAt: null, paused: true }), now),
    30,
  );
  assert.equal(focusElapsedSeconds(null, now), 0);
  assert.equal(formatClock(2538), '42:18');
  assert.equal(formatClock(-5), '00:00');
  assert.equal(formatClock(3600), '60:00');
});

test('seed state mirrors the H5 demo data', () => {
  const state = createSeedState('2026-11-23');
  assert.equal(state.settings.name, '阿川');
  assert.equal(state.settings.capacityMin, 360);
  assert.equal(state.settings.bufferRatio, 0.2);
  assert.equal(state.streak, 12);
  assert.equal(state.lastRecordedDate, '2026-11-22');
  assert.equal(state.history.length, 13);
  assert.equal(state.history[0].date, '2026-11-10');
  assert.equal(state.history[12].date, '2026-11-22');
  assert.equal(state.tasks.length, 16);
  [
    't-review',
    't-inbox-storyboard',
    't-inbox-invite',
    't-inbox-invoice',
    't-inbox-behance',
    't-inbox-tips',
    't-inbox-meeting',
    't-inbox-storage',
  ].forEach((id) => {
    assert.ok(state.tasks.some((item) => item.id === id));
  });
  const plan = state.plans['2026-11-23'];
  assert.equal(plannedMinutes(plan.blocks), 445);
  assert.equal(formatHours(plannedMinutes(plan.blocks)), '7.4');
  const ritual = plan.blocks.find((item) => item.id === 'b-review');
  assert.equal(ritual.kind, 'ritual');
  assert.equal(ritual.taskId, 't-review');
  assert.equal(ritual.startMin, 1260);
  assert.equal(ritual.endMin, 1290);
  assert.equal(ritual.countsTowardCapacity, true);
  assert.deepEqual(state.reviews['2026-11-22'].reasons, ['客户临时改需求']);
  assert.deepEqual(createEmptyPlan('2026-11-24', 300, 0.2), {
    date: '2026-11-24',
    capacityMin: 300,
    bufferRatio: 0.2,
    mitTaskIds: [],
    blocks: [],
  });
});

test('dashboard builds 7 and 14 day windows from the seed state', () => {
  const state = createSeedState('2026-11-23');
  const plan = state.plans['2026-11-23'];
  const dashboard = computeDashboard(state, plan, state.tasks, '2026-11-23');
  assert.equal(dashboard.weekly.length, 7);
  assert.equal(dashboard.calendar.length, 14);
  assert.equal(dashboard.streak, 12);
  assert.equal(dashboard.mostOverCategory, 'talk');
  assert.equal(dashboard.recordedDays, 13);
  assert.equal(dashboard.weekly[6].isToday, true);
  assert.equal(dashboard.weekly[6].label, '今');
  assert.equal(dashboard.weekly[6].focusMin, 22);
  assert.equal(dashboard.weekly[6].plannedMin, 445);
  assert.equal(dashboard.weekly[6].fulfillment, 22 / 445);
  assert.equal(dashboard.calendar[13].date, '2026-11-23');
  assert.equal(dashboard.calendar[13].label, '11 月 23 日 · 周一');
  assert.equal(dashboard.weekFocusMin, 1072);
  assert.equal(dashboard.lastWeekFocusMin, 1260);
  assert.equal(dashboard.weekDeltaMin, -188);
  assert.equal(dashboard.weekPlannedMin, 1945);
  assert.equal(dashboard.totalFocusMin, 2310);
});

test('ids keep prefixes and blockDuration clamps at zero', () => {
  assert.match(makeId('task'), /^task-/);
  assert.match(makeId(), /^id-/);
  assert.equal(blockDuration({ startMin: 540, endMin: 630 }), 90);
  assert.equal(blockDuration({ startMin: 630, endMin: 540 }), 0);
  assert.equal(todayKey(), dateKey(new Date()));
});
