const test = require('node:test');
const assert = require('node:assert/strict');

let storage = {};
global.wx = {
  getStorageSync(key) {
    return storage[key];
  },
  setStorageSync(key, value) {
    storage[key] = value;
  },
  removeStorageSync(key) {
    delete storage[key];
  },
  showToast() {},
  showModal() {},
  navigateTo() {},
  switchTab() {},
  navigateBack() {},
  getWindowInfo() {
    return { statusBarHeight: 22, windowWidth: 390, pixelRatio: 2 };
  },
  getSystemInfoSync() {
    return { statusBarHeight: 22, windowWidth: 390, pixelRatio: 2 };
  },
  createCanvasContext() {
    const noop = () => {};
    return {
      clearRect: noop,
      setLineWidth: noop,
      setLineCap: noop,
      setStrokeStyle: noop,
      setFillStyle: noop,
      setTextAlign: noop,
      setTextBaseline: noop,
      setFontSize: noop,
      fillText: noop,
      beginPath: noop,
      arc: noop,
      stroke: noop,
      draw: noop,
    };
  },
};

const store = require('../utils/store');
const schedule = require('../utils/schedule');

store.init({ demo: true });

function reset() {
  storage = {};
  store.init({ demo: true });
}

test('seed exposes today plan, mits, collect tasks, and capacity', () => {
  reset();
  const plan = store.getPlan();
  assert.equal(plan.date, store.getToday());
  assert.equal(store.getMits().length, 3);
  assert.equal(store.getCollectTasks().length, 7);
  const capacity = store.getCapacity();
  assert.equal(capacity.capacityMin, 360);
  assert.equal(capacity.plannedMin, 445);
  assert.equal(capacity.overMin, 85);
  assert.equal(store.getTodayRecord().actualMin, 22);
});

test('trim overload removes optional blocks and returns tasks to inbox', () => {
  reset();
  const removed = store.trimOverload();
  assert.equal(removed, 2);
  assert.equal(store.getCapacity().overMin, 0);
  assert.equal(store.getPlan().blocks.some((block) => block.title === '课程脚本 · 初稿'), false);
});

test('task CRUD and MIT toggling keep plan states consistent', () => {
  reset();
  const id = store.addTask({ title: '测试任务', estimateMin: 30, category: 'admin', energy: 'low' });
  assert.ok(store.getCollectTasks().some((task) => task.id === id));
  store.updateTask(id, { title: '测试任务改', estimateMin: 45 });
  assert.equal(store.getCollectTasks().find((task) => task.id === id).title, '测试任务改');
  store.toggleTaskDone(id);
  assert.equal(store.getCollectTasks().find((task) => task.id === id).status, 'done');
  store.toggleTaskDone(id);
  assert.equal(store.getCollectTasks().find((task) => task.id === id).status, 'inbox');
  store.deleteTask(id);
  assert.equal(store.getCollectTasks().some((task) => task.id === id), false);

  const portfolio = store.getMits().find((task) => task.id === 't-portfolio');
  assert.ok(portfolio);
  store.toggleTaskDone('t-portfolio');
  assert.equal(store.getState().tasks.find((task) => task.id === 't-portfolio').status, 'done');
  store.toggleTaskDone('t-portfolio');
  assert.equal(store.getState().tasks.find((task) => task.id === 't-portfolio').status, 'planned');
});

test('commit plan replaces today blocks and mits', () => {
  reset();
  const selected = ['t-hero', 't-proposal', 't-portfolio'];
  const tasks = store.getState().tasks.filter((task) => selected.includes(task.id));
  const result = schedule.buildSmartSchedule({
    date: store.getToday(),
    tasks,
    dayStartMin: 540,
    dayEndMin: 1290,
    capacityMin: 360,
    bufferRatio: 0.2,
    includeReview: true,
  });
  store.commitPlan(result.blocks, selected);
  assert.deepEqual(store.getPlan().mitTaskIds, selected);
  assert.equal(store.getPlan().blocks.filter((block) => block.kind === 'task').length, 3);
  assert.equal(store.getState().tasks.find((task) => task.id === 't-hero').status, 'planned');
});

test('focus session pauses, completes partially, and records minutes', () => {
  reset();
  const block = store.getPlan().blocks.find((item) => item.id === 'b-hero');
  assert.ok(store.startFocus(block.id));
  store.toggleFocusPause();
  assert.equal(store.getFocus().paused, true);
  store.toggleFocusPause();
  assert.equal(store.getFocus().paused, false);
  store.completeFocus('partial', 30);
  assert.equal(store.getFocus(), null);
  assert.equal(store.getPlan().blocks.find((item) => item.id === 'b-hero').actualMin, 30);
  assert.equal(store.getState().tasks.find((task) => task.id === 't-hero').actualMin, 30);
  assert.equal(store.getTodayRecord().actualMin, 52);
});

test('a resumed focus adds to the block actual instead of overwriting it', () => {
  reset();
  const block = store.getPlan().blocks.find((item) => item.id === 'b-hero');
  store.startFocus(block.id);
  store.completeFocus('partial', 20);
  store.startFocus(block.id);
  store.completeFocus('done', 30);
  const updated = store.getPlan().blocks.find((item) => item.id === 'b-hero');
  assert.equal(updated.actualMin, 50);
  assert.equal(store.getState().tasks.find((task) => task.id === 't-hero').actualMin, 50);
});

test('distraction capture and promotion creates a task', () => {
  reset();
  const block = store.getPlan().blocks.find((item) => item.id === 'b-hero');
  store.startFocus(block.id);
  store.captureDistraction('回个客户消息', 'todo');
  const item = store.getState().distractions[0];
  assert.equal(item.text, '回个客户消息');
  assert.equal(item.type, 'todo');
  store.promoteDistraction(item.id);
  assert.ok(store.getCollectTasks().some((task) => task.title === '回个客户消息'));
  assert.equal(store.getState().distractions[0].handled, true);
});

test('review saves history, extends streak, and applies tomorrow capacity', () => {
  reset();
  const block = store.getPlan().blocks.find((item) => item.id === 'b-hero');
  store.startFocus(block.id);
  store.completeFocus('partial', 30);
  store.saveReview({
    reasons: ['客户临时改需求'],
    note: '今天先做难的事。',
    acceptedSuggestion: true,
    tomorrowCapacityMin: 300,
  });
  const state = store.getState();
  assert.equal(state.streak, 13);
  assert.equal(state.reviews[store.getToday()].note, '今天先做难的事。');
  assert.equal(state.history.find((record) => record.date === store.getToday()).actualMin, 52);
  assert.equal(state.tomorrowCapacityMin, 300);
});

test('settings update today capacity and reset restores seed', () => {
  reset();
  store.updateSettings({ capacityMin: 300, bufferRatio: 0.3, dayStartMin: 600 });
  assert.equal(store.getPlan().capacityMin, 300);
  assert.equal(store.getPlan().bufferRatio, 0.3);
  assert.equal(store.getSettings().dayStartMin, 600);
  store.addTask({ title: '设置后任务' });
  store.resetDemo();
  assert.equal(store.getPlan().capacityMin, 360);
  assert.equal(store.getCollectTasks().some((task) => task.title === '设置后任务'), false);
});
