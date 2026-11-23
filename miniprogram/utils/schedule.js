const { plannedMinutes, sortBlocks } = require('./capacity');

const ENERGY_ORDER = { high: 0, mid: 1, low: 2 };

function sortTasksForSchedule(tasks) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const energy = ENERGY_ORDER[a.task.energy] - ENERGY_ORDER[b.task.energy];
      if (energy !== 0) return energy;
      return a.index - b.index;
    })
    .map((entry) => entry.task);
}

function makeBlock(partial) {
  return Object.assign({}, partial, {
    id:
      partial.id !== undefined && partial.id !== null
        ? partial.id
        : `block-${partial.startMin}-${partial.endMin}-${partial.title}`,
  });
}

function buildSmartSchedule(input) {
  const date = input.date;
  const tasks = input.tasks;
  const dayStartMin = input.dayStartMin;
  const dayEndMin = input.dayEndMin;
  const capacityMin = input.capacityMin;
  const lunchStartMin = input.lunchStartMin === undefined ? 12 * 60 : input.lunchStartMin;
  const lunchEndMin = input.lunchEndMin === undefined ? 13 * 60 + 30 : input.lunchEndMin;
  const includeReview = input.includeReview === undefined ? true : input.includeReview;
  const reviewStartMin = input.reviewStartMin === undefined ? 21 * 60 : input.reviewStartMin;

  const blocks = [];
  const scheduledTaskIds = [];
  const unscheduledTaskIds = [];
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

    let slot = findFreeSlot(blocks, date, duration, cursor, dayEndMin);
    if (!slot && cursor > dayStartMin) {
      slot = findFreeSlot(blocks, date, duration, dayStartMin, dayEndMin);
    }
    if (!slot) {
      unscheduledTaskIds.push(task.id);
      continue;
    }

    const start = slot.startMin;
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
  const bufferEnd = Math.min(
    bufferStart + bufferMin,
    reviewStart === null ? dayEndMin : reviewStart,
    dayEndMin,
  );

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

function findFreeSlot(blocks, date, durationMin, fromMin, untilMin, ignoreBlockId) {
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

function rescheduleBlock(blocks, blockId, dayEndMin) {
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
        ? Object.assign({}, block, {
            startMin: slot.startMin,
            endMin: slot.endMin,
            movedFrom:
              block.movedFrom !== undefined && block.movedFrom !== null
                ? block.movedFrom
                : { date: block.date, startMin: block.startMin },
          })
        : block,
    ),
  );
}

function findCurrentBlock(blocks, nowMin, date) {
  const todayBlocks = blocks.filter((block) => block.date === date && block.kind !== 'buffer');
  return todayBlocks.find((block) => block.startMin <= nowMin && block.endMin > nowMin) || null;
}

function findNextBlock(blocks, nowMin, date) {
  const candidates = blocks
    .filter(
      (block) =>
        block.date === date &&
        block.startMin > nowMin &&
        (block.kind === 'task' || block.kind === 'ritual'),
    )
    .sort((a, b) => a.startMin - b.startMin);
  return candidates.length > 0 ? candidates[0] : null;
}

function findCurrentTaskBlock(blocks, nowMin, date) {
  const current = findCurrentBlock(blocks, nowMin, date);
  if (current && current.kind === 'task') return current;
  return null;
}

function overdueBlocks(blocks, nowMin, date) {
  return blocks.filter(
    (block) =>
      block.date === date &&
      block.kind === 'task' &&
      block.endMin <= nowMin &&
      !block.completion,
  );
}

function blockDuration(block) {
  return Math.max(0, block.endMin - block.startMin);
}

module.exports = {
  buildSmartSchedule,
  findFreeSlot,
  rescheduleBlock,
  findCurrentBlock,
  findNextBlock,
  findCurrentTaskBlock,
  overdueBlocks,
  sortTasksForSchedule,
  blockDuration,
};
