const { addDays, dateKey, nowMinutes } = require('./date');
const { createSeedState, createEmptyPlan } = require('./seed');
const { capacityStatus, sortBlocks, trimCandidates } = require('./capacity');
const {
  computeDayRecord,
  planTaskIds,
  suggestTomorrowCapacity,
} = require('./review');
const { computeDashboard } = require('./stats');
const { focusElapsedSeconds } = require('./focus');
const {
  findCurrentBlock,
  findNextBlock,
  rescheduleBlock: rescheduleBlockInPlan,
} = require('./schedule');
const { makeId } = require('./id');
const { clamp } = require('./format');

const STORAGE_KEY = 'daymark.state.v1';

let state = null;
let demoMode = false;
let demoNow = null;

function readStorage() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null;
  } catch (error) {
    return null;
  }
}

function writeStorage(value) {
  try {
    wx.setStorageSync(STORAGE_KEY, value);
  } catch (error) {
    return;
  }
}

function dropStorage() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (error) {
    return;
  }
}

function toast(message) {
  if (typeof wx === 'undefined' || !wx.showToast) return;
  wx.showToast({ title: message, icon: 'none', duration: 2000 });
}

function init(options) {
  demoMode = Boolean(options && options.demo);
  if (demoMode) {
    demoNow = new Date();
    demoNow.setHours(10, 12, 0, 0);
  }
  const stored = readStorage();
  const today = dateKey(getNow());
  state = stored ? withTodayPlan(stored, today) : createSeedState(today);
  writeStorage(state);
}

function getNow() {
  return demoMode && demoNow ? new Date(demoNow) : new Date();
}

function getToday() {
  return dateKey(getNow());
}

function withTodayPlan(current, today) {
  if (current.plans[today]) return current;
  const capacityMin = current.tomorrowCapacityMin || current.settings.capacityMin;
  return {
    ...current,
    plans: {
      ...current.plans,
      [today]: createEmptyPlan(today, capacityMin, current.settings.bufferRatio),
    },
    focus: null,
    tomorrowCapacityMin: null,
  };
}

function ensureToday() {
  if (!state) init();
  const today = getToday();
  if (!state.plans[today]) {
    state = withTodayPlan(state, today);
    writeStorage(state);
  }
}

function getState() {
  ensureToday();
  return state;
}

function save() {
  writeStorage(state);
}

function getPlan() {
  ensureToday();
  return state.plans[getToday()];
}

function getSettings() {
  return getState().settings;
}

function getTaskMap() {
  const map = {};
  getState().tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function getMits() {
  const plan = getPlan();
  const map = getTaskMap();
  return plan.mitTaskIds.map((id) => map[id]).filter(Boolean);
}

function getCollectTasks() {
  const plan = getPlan();
  const ids = new Set(planTaskIds(plan));
  return getState().tasks.filter((task) => !ids.has(task.id));
}

function getCapacity() {
  const plan = getPlan();
  return capacityStatus(plan.blocks, plan.capacityMin);
}

function getCurrentBlock() {
  ensureToday();
  return findCurrentBlock(getPlan().blocks, nowMinutes(getNow()), getToday());
}

function getNextBlock() {
  ensureToday();
  return findNextBlock(getPlan().blocks, nowMinutes(getNow()), getToday());
}

function getFocus() {
  return getState().focus;
}

function getFocusBlock() {
  const focus = getFocus();
  if (!focus) return null;
  return getPlan().blocks.find((block) => block.id === focus.blockId) || null;
}

function getFocusTask() {
  const block = getFocusBlock();
  if (!block || !block.taskId) return null;
  return getTaskMap()[block.taskId] || null;
}

function getTodayRecord() {
  return computeDayRecord(getPlan(), getState().tasks);
}

function getTodayReview() {
  return getState().reviews[getToday()] || null;
}

function getSuggestion() {
  const plan = getPlan();
  return suggestTomorrowCapacity(getState().history, plan.capacityMin);
}

function getDashboard() {
  return computeDashboard(getState(), getPlan(), getState().tasks, getToday());
}

function getGreeting() {
  const hour = getNow().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function addTask(input) {
  ensureToday();
  const task = {
    id: makeId('task'),
    title: (input.title || '').trim(),
    estimateMin: Math.max(5, input.estimateMin || state.settings.defaultEstimateMin),
    category: input.category || 'create',
    energy: input.energy || 'mid',
    status: 'inbox',
    createdAt: new Date().toISOString(),
  };
  state.tasks = [task, ...state.tasks];
  save();
  toast('已放入收集箱');
  return task.id;
}

function updateTask(id, patch) {
  ensureToday();
  state.tasks = state.tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          ...patch,
          title: patch.title !== undefined ? patch.title.trim() || task.title : task.title,
        }
      : task,
  );
  save();
}

function deleteTask(id) {
  ensureToday();
  const today = getToday();
  Object.keys(state.plans).forEach((date) => {
    const plan = state.plans[date];
    state.plans[date] = {
      ...plan,
      mitTaskIds: plan.mitTaskIds.filter((taskId) => taskId !== id),
      blocks: plan.blocks.filter((block) => block.taskId !== id),
    };
  });
  if (state.focus) {
    const block = state.plans[today].blocks.find((item) => item.id === state.focus.blockId);
    if (!block) state.focus = null;
  }
  state.tasks = state.tasks.filter((task) => task.id !== id);
  save();
  toast('已删除');
}

function toggleTaskDone(id) {
  ensureToday();
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  const today = getToday();
  const plan = state.plans[today];
  const inPlan = Boolean(
    plan &&
      (plan.mitTaskIds.includes(id) || plan.blocks.some((block) => block.taskId === id)),
  );
  const willBeDone = task.status !== 'done';
  state.tasks = state.tasks.map((item) =>
    item.id === id
      ? {
          ...item,
          status: willBeDone ? 'done' : inPlan ? 'planned' : 'inbox',
          actualMin: willBeDone ? item.actualMin || item.estimateMin : undefined,
          completedAt: willBeDone ? new Date().toISOString() : undefined,
        }
      : item,
  );
  Object.keys(state.plans).forEach((date) => {
    const current = state.plans[date];
    state.plans[date] = {
      ...current,
      blocks: current.blocks.map((block) =>
        block.taskId === id
          ? {
              ...block,
              completion: willBeDone ? 'done' : undefined,
              actualMin: willBeDone
                ? block.actualMin || block.endMin - block.startMin
                : undefined,
            }
          : block,
      ),
    };
  });
  save();
  if (willBeDone) toast('已完成 · 晚上会出现在复盘里');
}

function setMits(ids) {
  ensureToday();
  const today = getToday();
  const plan = state.plans[today];
  const next = [...new Set(ids)].slice(0, 3);
  state.plans[today] = { ...plan, mitTaskIds: next };
  state.tasks = state.tasks.map((task) =>
    next.includes(task.id) && task.status === 'inbox' ? { ...task, status: 'planned' } : task,
  );
  save();
}

function commitPlan(blocks, mitIds) {
  ensureToday();
  const today = getToday();
  const plan = state.plans[today];
  const nextMits = [...new Set(mitIds)].slice(0, 3);
  const referenced = new Set(nextMits);
  blocks.forEach((block) => {
    if (block.taskId) referenced.add(block.taskId);
  });
  const previousIds = new Set(planTaskIds(plan));
  state.tasks = state.tasks.map((task) => {
    if (referenced.has(task.id) && (task.status === 'inbox' || task.status === 'moved')) {
      return { ...task, status: 'planned' };
    }
    if (!referenced.has(task.id) && previousIds.has(task.id) && task.status === 'planned') {
      return { ...task, status: 'inbox' };
    }
    return task;
  });
  state.plans[today] = {
    ...plan,
    mitTaskIds: nextMits,
    blocks: sortBlocks(blocks),
  };
  state.focus = null;
  save();
  toast('今日计划已生成');
}

function removeBlock(id) {
  ensureToday();
  const today = getToday();
  const plan = state.plans[today];
  const block = plan.blocks.find((item) => item.id === id);
  if (!block) return;
  const blocks = plan.blocks.filter((item) => item.id !== id);
  const stillUsed = block.taskId
    ? blocks.some((item) => item.taskId === block.taskId)
    : false;
  if (block.taskId && !stillUsed) {
    state.tasks = state.tasks.map((task) =>
      task.id === block.taskId && (task.status === 'planned' || task.status === 'active')
        ? { ...task, status: 'inbox' }
        : task,
    );
  }
  state.plans[today] = { ...plan, blocks };
  if (state.focus && state.focus.blockId === id) state.focus = null;
  save();
  toast('已移出该时间块');
}

function rescheduleBlock(id) {
  ensureToday();
  const today = getToday();
  const plan = state.plans[today];
  const blocks = rescheduleBlockInPlan(plan.blocks, id, state.settings.dayEndMin);
  if (!blocks) {
    toast('后面没有合适的空位了');
    return false;
  }
  state.plans[today] = { ...plan, blocks };
  save();
  toast('已换到下一个空位');
  return true;
}

function trimOverload() {
  ensureToday();
  const today = getToday();
  const plan = state.plans[today];
  const ids = trimCandidates(plan.blocks, plan.capacityMin);
  if (!ids.length) {
    toast('没有可自动移出的块，手动调整一下');
    return 0;
  }
  const removed = new Set(ids);
  const removedTaskIds = new Set(
    plan.blocks
      .filter((block) => removed.has(block.id) && block.taskId)
      .map((block) => block.taskId),
  );
  const blocks = plan.blocks.filter((block) => !removed.has(block.id));
  const stillUsed = new Set(blocks.map((block) => block.taskId).filter(Boolean));
  state.tasks = state.tasks.map((task) =>
    removedTaskIds.has(task.id) && !stillUsed.has(task.id) && task.status === 'planned'
      ? { ...task, status: 'inbox' }
      : task,
  );
  state.plans[today] = { ...plan, blocks };
  if (state.focus && removed.has(state.focus.blockId)) state.focus = null;
  save();
  const status = capacityStatus(blocks, plan.capacityMin);
  toast(
    status.overMin > 0
      ? `已移出 ${ids.length} 项，仍超出 ${status.overMin} 分钟`
      : `已移出 ${ids.length} 项，容量回到安全区`,
  );
  return ids.length;
}

function startFocus(blockId) {
  ensureToday();
  if (state.focus && state.focus.blockId !== blockId) {
    toast('先结束当前专注，再开始下一块');
    return false;
  }
  const plan = getPlan();
  const block = plan.blocks.find((item) => item.id === blockId);
  if (!block || (block.kind !== 'task' && block.kind !== 'ritual')) {
    toast('这个块不是可专注的任务');
    return false;
  }
  const task = block.taskId ? getTaskMap()[block.taskId] : null;
  if (task && task.status === 'done') {
    toast('这个任务已经完成了');
    return false;
  }
  state.focus = {
    blockId,
    date: getToday(),
    startedAt: new Date().toISOString(),
    accumulatedSec: 0,
    paused: false,
    pausedAt: null,
  };
  if (block.taskId) {
    state.tasks = state.tasks.map((item) =>
      item.id === block.taskId && item.status !== 'done'
        ? { ...item, status: 'active' }
        : item,
    );
  }
  save();
  return true;
}

function toggleFocusPause() {
  ensureToday();
  if (!state.focus) return;
  const moment = new Date();
  if (state.focus.paused) {
    state.focus = {
      ...state.focus,
      paused: false,
      pausedAt: null,
      startedAt: moment.toISOString(),
    };
  } else {
    const extra = state.focus.startedAt
      ? (moment.getTime() - new Date(state.focus.startedAt).getTime()) / 1000
      : 0;
    state.focus = {
      ...state.focus,
      accumulatedSec: state.focus.accumulatedSec + extra,
      startedAt: null,
      paused: true,
      pausedAt: moment.toISOString(),
    };
  }
  save();
}

function captureDistraction(text, type) {
  ensureToday();
  const value = (text || '').trim();
  if (!value) return;
  state.distractions = [
    {
      id: makeId('distraction'),
      text: value,
      type: type || 'idea',
      createdAt: new Date().toISOString(),
      blockId: state.focus ? state.focus.blockId : undefined,
    },
    ...state.distractions,
  ];
  save();
  toast('已放在稍后处理，继续这一块');
}

function promoteDistraction(id) {
  ensureToday();
  const item = state.distractions.find((entry) => entry.id === id);
  if (!item) return;
  addTask({ title: item.text, estimateMin: 30, category: 'create', energy: 'mid' });
  state.distractions = state.distractions.map((entry) =>
    entry.id === id ? { ...entry, handled: true } : entry,
  );
  save();
}

function completeFocus(completion, actualMin) {
  ensureToday();
  const focus = state.focus;
  if (!focus) return;
  const plan = getPlan();
  const block = plan.blocks.find((item) => item.id === focus.blockId);
  if (!block) {
    state.focus = null;
    save();
    return;
  }
  const elapsed = focusElapsedSeconds(focus, new Date());
  const actual = Math.max(1, actualMin || Math.round(elapsed / 60));
  const done = completion === 'done';
  const today = getToday();
  state.plans[today] = {
    ...plan,
    blocks: plan.blocks.map((item) =>
      item.id === block.id
        ? { ...item, completion, actualMin: (item.actualMin || 0) + actual }
        : item,
    ),
  };
  if (block.taskId) {
    state.tasks = state.tasks.map((task) =>
      task.id === block.taskId
        ? {
            ...task,
            status: done ? 'done' : 'partial',
            actualMin: (task.actualMin || 0) + actual,
            completedAt: done ? new Date().toISOString() : task.completedAt,
          }
        : task,
    );
  }
  state.focus = null;
  save();
  toast(done ? `本段已完成 · 记账 ${actual} 分钟` : `已记录部分完成 · ${actual} 分钟`);
}

function saveReview(input) {
  ensureToday();
  const today = getToday();
  const record = computeDayRecord(getPlan(), state.tasks);
  const history = [
    ...state.history.filter((item) => item.date !== today),
    record,
  ].sort((a, b) => a.date.localeCompare(b.date));
  let streak = state.streak;
  if (state.lastRecordedDate !== today) {
    streak = state.lastRecordedDate === addDays(today, -1) ? state.streak + 1 : 1;
  }
  state.history = history;
  state.reviews[today] = {
    date: today,
    reasons: input.reasons || [],
    note: (input.note || '').trim(),
    tomorrowCapacityMin: input.tomorrowCapacityMin,
    acceptedSuggestion: Boolean(input.acceptedSuggestion),
    completedAt: new Date().toISOString(),
  };
  state.streak = streak;
  state.lastRecordedDate = today;
  if (input.acceptedSuggestion && input.tomorrowCapacityMin) {
    state.tomorrowCapacityMin = input.tomorrowCapacityMin;
  }
  save();
  toast('已收下今天 · 明天会更准一点');
}

function updateSettings(patch) {
  ensureToday();
  const settings = {
    ...state.settings,
    ...patch,
    capacityMin: Math.max(60, Math.min(720, patch.capacityMin || state.settings.capacityMin)),
    bufferRatio: Math.max(
      0,
      Math.min(0.5, patch.bufferRatio === undefined ? state.settings.bufferRatio : patch.bufferRatio),
    ),
    dayStartMin: Math.max(
      0,
      Math.min(1380, patch.dayStartMin === undefined ? state.settings.dayStartMin : patch.dayStartMin),
    ),
    dayEndMin: Math.max(
      0,
      Math.min(1439, patch.dayEndMin === undefined ? state.settings.dayEndMin : patch.dayEndMin),
    ),
    defaultEstimateMin: Math.max(
      5,
      Math.min(
        240,
        patch.defaultEstimateMin === undefined
          ? state.settings.defaultEstimateMin
          : patch.defaultEstimateMin,
      ),
    ),
  };
  state.settings = settings;
  const today = getToday();
  state.plans[today] = {
    ...state.plans[today],
    capacityMin: settings.capacityMin,
    bufferRatio: settings.bufferRatio,
  };
  save();
}

function resetDemo() {
  const today = getToday();
  dropStorage();
  state = createSeedState(today);
  writeStorage(state);
  toast('演示数据已重置');
}

module.exports = {
  init,
  ensureToday,
  getNow,
  getToday,
  getState,
  getPlan,
  getSettings,
  getMits,
  getCollectTasks,
  getCapacity,
  getCurrentBlock,
  getNextBlock,
  getFocus,
  getFocusBlock,
  getFocusTask,
  getTodayRecord,
  getTodayReview,
  getSuggestion,
  getDashboard,
  getGreeting,
  addTask,
  updateTask,
  deleteTask,
  toggleTaskDone,
  setMits,
  commitPlan,
  removeBlock,
  rescheduleBlock,
  trimOverload,
  startFocus,
  toggleFocusPause,
  captureDistraction,
  promoteDistraction,
  completeFocus,
  saveReview,
  updateSettings,
  resetDemo,
  toast,
};
