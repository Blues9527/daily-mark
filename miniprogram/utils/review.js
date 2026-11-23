const { blockMinutes, plannedMinutes } = require('./capacity');

const CATEGORIES = ['create', 'talk', 'admin', 'life'];

function emptyCategories() {
  return {
    create: { plannedMin: 0, actualMin: 0 },
    talk: { plannedMin: 0, actualMin: 0 },
    admin: { plannedMin: 0, actualMin: 0 },
    life: { plannedMin: 0, actualMin: 0 },
  };
}

function blockActual(block) {
  if (typeof block.actualMin === 'number') return block.actualMin;
  if (block.completion === 'done') return blockMinutes(block);
  return 0;
}

function addMinutes(map, category, value) {
  map.set(category, (map.get(category) || 0) + value);
}

function planTaskIds(plan) {
  const ids = new Set(plan.mitTaskIds);
  plan.blocks.forEach((block) => {
    if (block.taskId) ids.add(block.taskId);
  });
  return [...ids];
}

function computeDayRecord(plan, tasks) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const categories = emptyCategories();
  const plannedByCategory = new Map();
  const actualByCategory = new Map();
  const planIds = planTaskIds(plan);
  let actualMin = 0;

  plan.blocks.forEach((block) => {
    if (!block.taskId || (block.kind !== 'task' && block.kind !== 'ritual')) return;
    const task = taskMap.get(block.taskId);
    if (!task) return;
    const planMinutes = blockMinutes(block);
    const actual = blockActual(block);
    addMinutes(plannedByCategory, task.category, planMinutes);
    addMinutes(actualByCategory, task.category, actual);
    actualMin += actual;
  });

  planIds.forEach((taskId) => {
    const task = taskMap.get(taskId);
    if (!task || !task.actualMin) return;
    const hasBlock = plan.blocks.some((block) => block.taskId === taskId && block.kind === 'task');
    if (hasBlock) return;
    addMinutes(actualByCategory, task.category, task.actualMin);
    actualMin += task.actualMin;
  });

  CATEGORIES.forEach((category) => {
    categories[category] = {
      plannedMin: plannedByCategory.get(category) || 0,
      actualMin: actualByCategory.get(category) || 0,
    };
  });

  const completedTasks = planIds.filter((taskId) => {
    const task = taskMap.get(taskId);
    return task && (task.status === 'done' || task.status === 'partial');
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

function suggestTomorrowCapacity(history, currentCapacityMin, todayRecord) {
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

const REVIEW_REASONS = ['客户临时改需求', '低估了难度', '状态不好', '主动调整'];

module.exports = {
  planTaskIds,
  computeDayRecord,
  suggestTomorrowCapacity,
  REVIEW_REASONS,
};
