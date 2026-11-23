const path = require('path');

let storage = {};
const toastLog = [];
const navLog = [];

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
  showToast(options) {
    toastLog.push(options.title);
  },
  showModal(options) {
    if (options.success) options.success({ confirm: true, cancel: false });
  },
  navigateTo(options) {
    navLog.push(options.url);
  },
  switchTab(options) {
    navLog.push(options.url);
  },
  navigateBack(options) {
    navLog.push('back');
    if (options && options.success) options.success({});
  },
  pageScrollTo() {},
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

global.getApp = () => ({ globalData: { statusBarHeight: 22 } });
global.getCurrentPages = () => [{}];

let capturedPage = null;
global.Page = (config) => {
  capturedPage = config;
};

const store = require('../utils/store');
store.init({ demo: true });

function makeInstance(config) {
  const instance = Object.assign({}, config);
  instance.data = JSON.parse(JSON.stringify(config.data || {}));
  instance.setData = function setData(patch, callback) {
    Object.assign(this.data, patch || {});
    if (callback) callback();
  };
  return instance;
}

function loadPage(relativePath) {
  const resolved = require.resolve(relativePath);
  delete require.cache[resolved];
  capturedPage = null;
  require(relativePath);
  if (!capturedPage) throw new Error(`${relativePath} did not call Page()`);
  return makeInstance(capturedPage);
}

function runPage(name, relativePath, setup) {
  try {
    store.resetDemo();
    if (setup) setup();
    const page = loadPage(relativePath);
    if (page.onLoad) page.onLoad({});
    if (page.onShow) page.onShow();
    if (page.onReady) page.onReady();
    const data = page.data;
    const keys = Object.keys(data).filter((key) => key !== 'statusBarHeight');
    console.log(
      `PASS ${name}: ${keys.length} data keys` +
        (Array.isArray(data.tasks) ? `, tasks=${data.tasks.length}` : '') +
        (Array.isArray(data.candidates) ? `, candidates=${data.candidates.length}` : '') +
        (Array.isArray(data.blocks) ? `, blocks=${data.blocks.length}` : '') +
        (Array.isArray(data.timelineItems) ? `, timeline=${data.timelineItems.length}` : '') +
        (Array.isArray(data.weekly) ? `, weekly=${data.weekly.length}` : ''),
    );
    if (page.onHide) page.onHide();
    if (page.onUnload) page.onUnload();
    return page;
  } catch (error) {
    console.error(`FAIL ${name}: ${error.stack || error.message}`);
    process.exitCode = 1;
    return null;
  }
}

const pagesDir = path.join(__dirname, '..', 'pages');

runPage('today', path.join(pagesDir, 'today', 'today.js'));

runPage('collect', path.join(pagesDir, 'collect', 'collect.js'), () => {
  const first = store.getCollectTasks()[0];
  if (!first) throw new Error('seed collect task missing');
});

runPage('plan', path.join(pagesDir, 'plan', 'plan.js'));
runPage('focus', path.join(pagesDir, 'focus', 'focus.js'), () => {
  const block = store.getPlan().blocks.find((item) => item.kind === 'task');
  if (!block) throw new Error('seed task block missing');
  if (!store.startFocus(block.id)) throw new Error('startFocus failed');
});
runPage('review', path.join(pagesDir, 'review', 'review.js'));
runPage('stats', path.join(pagesDir, 'stats', 'stats.js'));
runPage('settings', path.join(pagesDir, 'settings', 'settings.js'));

const planPage = loadPage(path.join(pagesDir, 'plan', 'plan.js'));
planPage.onLoad({});
planPage.goStep2();
planPage.goStep3();
if (!planPage.draftBlocks || planPage.draftBlocks.length === 0) {
  console.error('FAIL plan interaction: no draft blocks');
  process.exitCode = 1;
} else {
  console.log(`PASS plan interaction: draft blocks=${planPage.draftBlocks.length}`);
}

const collectPage = loadPage(path.join(pagesDir, 'collect', 'collect.js'));
collectPage.onLoad({});
collectPage.openCreate();
collectPage.onTitleInput({ detail: { value: '运行时测试任务' } });
collectPage.onSave();
const created = store.getCollectTasks().find((task) => task.title === '运行时测试任务');
if (!created) {
  console.error('FAIL collect interaction: task not added');
  process.exitCode = 1;
} else {
  console.log('PASS collect interaction: created task');
  collectPage.openEdit({ currentTarget: { dataset: { id: created.id } } });
  collectPage.onTitleInput({ detail: { value: '运行时测试任务改' } });
  collectPage.onSave();
  const edited = store.getCollectTasks().find((task) => task.id === created.id);
  if (!edited || edited.title !== '运行时测试任务改') {
    console.error('FAIL collect interaction: task not edited');
    process.exitCode = 1;
  } else {
    console.log('PASS collect interaction: edited task');
  }
  collectPage.openEdit({ currentTarget: { dataset: { id: created.id } } });
  collectPage.onDelete();
  if (store.getCollectTasks().some((task) => task.id === created.id)) {
    console.error('FAIL collect interaction: task not deleted');
    process.exitCode = 1;
  } else {
    console.log('PASS collect interaction: deleted task');
  }
}

const planCommitPage = loadPage(path.join(pagesDir, 'plan', 'plan.js'));
planCommitPage.onLoad({});
planCommitPage.goStep2();
planCommitPage.goStep3();
planCommitPage.onCommitPlan();
if (!store.getPlan().mitTaskIds.length) {
  console.error('FAIL plan interaction: commit failed');
  process.exitCode = 1;
} else {
  console.log('PASS plan interaction: committed plan');
}

store.resetDemo();
const focusBlock = store.getPlan().blocks.find((item) => item.kind === 'task');
store.startFocus(focusBlock.id);
const focusPage = loadPage(path.join(pagesDir, 'focus', 'focus.js'));
focusPage.onLoad({});
focusPage.onShow();
focusPage.togglePause();
if (!store.getFocus() || !store.getFocus().paused) {
  console.error('FAIL focus interaction: pause failed');
  process.exitCode = 1;
} else {
  focusPage.togglePause();
  focusPage.handleDone();
  if (store.getFocus() !== null) {
    console.error('FAIL focus interaction: completion did not clear focus');
    process.exitCode = 1;
  } else {
    console.log('PASS focus interaction: pause and complete');
  }
}
focusPage.onHide();

store.resetDemo();
const reviewPage = loadPage(path.join(pagesDir, 'review', 'review.js'));
reviewPage.onLoad({});
reviewPage.toggleReason({ currentTarget: { dataset: { reason: '客户临时改需求' } } });
reviewPage.onNoteInput({ detail: { value: '测试复盘备注' } });
reviewPage.acceptSuggestion();
reviewPage.handleSave();
if (!store.getTodayReview() || store.getTodayReview().note !== '测试复盘备注') {
  console.error('FAIL review interaction: save failed');
  process.exitCode = 1;
} else {
  console.log('PASS review interaction: saved review');
}

store.resetDemo();
const settingsPage = loadPage(path.join(pagesDir, 'settings', 'settings.js'));
settingsPage.onLoad({});
settingsPage.onCapacityInput({ detail: { value: '300' } });
settingsPage.onBufferChange({ detail: { value: 30 } });
settingsPage.onStartChange({ detail: { value: '10:00' } });
settingsPage.onEndChange({ detail: { value: '20:00' } });
settingsPage.onEstimateInput({ detail: { value: '45' } });
settingsPage.handleSave();
if (store.getSettings().capacityMin !== 300 || store.getSettings().bufferRatio !== 0.3) {
  console.error('FAIL settings interaction: save failed');
  process.exitCode = 1;
} else {
  console.log('PASS settings interaction: saved settings');
}

if (toastLog.length === 0) {
  console.error('FAIL toast: no toast recorded');
  process.exitCode = 1;
} else {
  console.log(`PASS toast events: ${toastLog.length}`);
}

console.log('runtime checks complete');
