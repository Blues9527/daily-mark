const store = require('../../utils/store');
const { CATEGORY_META, ENERGY_META } = require('../../utils/constants');
const { formatDuration, formatMinutesLabel, minutesToTime } = require('../../utils/format');
const schedule = require('../../utils/schedule');
const { capacityStatus, sortBlocks } = require('../../utils/capacity');

const QUICK_IDEAS = ['回一封邮件', '整理报价单', '看一节课程'];
const STEP_KICKERS = {
  1: '晨间规划 · 90 秒',
  2: '晨间规划 · 第 2 步',
  3: '晨间规划 · 第 3 步',
};

function decorateTask(task) {
  const category = CATEGORY_META[task.category] || CATEGORY_META.create;
  const energy = ENERGY_META[task.energy] || ENERGY_META.mid;
  return Object.assign({}, task, {
    categoryLabel: category.label,
    categoryColor: category.color,
    energyLabel: energy.label,
    durationText: formatDuration(task.estimateMin),
    moved: task.status === 'moved',
    picked: false,
    rankLabel: '',
  });
}

function decorateBlock(block, taskMap) {
  const task = block.taskId ? taskMap[block.taskId] : null;
  let color = '#a89e90';
  let kindLabel = '留白';
  if (block.kind === 'break') {
    color = '#48657d';
    kindLabel = '午餐';
  } else if (block.kind === 'ritual') {
    color = '#4f6b4f';
    kindLabel = '复盘';
  } else if (block.kind === 'task') {
    kindLabel = '任务';
  }
  if (task) {
    color = task.categoryColor;
    kindLabel = task.categoryLabel;
  }
  return Object.assign({}, block, {
    titleText: task ? task.title : block.title,
    timeText: `${minutesToTime(block.startMin)}–${minutesToTime(block.endMin)}`,
    durationText: formatDuration(block.endMin - block.startMin),
    color,
    kindLabel,
    canMove: block.kind === 'task',
  });
}

function rotateTasks(tasks, offset) {
  if (tasks.length <= 1) return tasks;
  const shift = offset % tasks.length;
  return tasks.slice(shift).concat(tasks.slice(0, shift));
}

Page({
  data: {
    statusBarHeight: 20,
    step: 1,
    stepKicker: STEP_KICKERS[1],
    quickIdeas: QUICK_IDEAS,
    draft: '',
    canAdd: false,
    candidates: [],
    candidateCount: 0,
    selectedIds: [],
    pickedCount: 0,
    restCount: 0,
    laterLeft: '候选都在这了',
    laterRight: '已选 0 件',
    step1Tip: '至少写下一件事，再开始挑三件。',
    step2Tip: '至少留一件给今天。',
    variant: 0,
    capPlanned: '0m',
    capCapacity: '0m',
    capRemaining: '0m',
    capWidth: '0%',
    capMeta: '容量已经排满',
    dayStartText: '09:00',
    dayEndText: '21:00',
    rangeText: '09:00 – 21:00',
    blocks: [],
    unscheduled: [],
  },

  onLoad() {
    const app = getApp();
    const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
    this.selectedIds = [];
    this.selectionInitialized = false;
    this.draftBlocks = [];
    this.unscheduledIds = [];
    this.setData({ statusBarHeight });
    store.ensureToday();
    this.refreshCandidates();
  },

  applySelection(list, ids) {
    const selected = ids.filter((id, index) => ids.indexOf(id) === index).slice(0, 3);
    this.selectedIds = selected;
    const candidates = list.map((task) => {
      const rank = selected.indexOf(task.id);
      return Object.assign({}, task, {
        picked: rank >= 0,
        rankLabel: rank >= 0 ? `第 ${rank + 1} 件` : '',
      });
    });
    const pickedCount = selected.length;
    const restCount = Math.max(0, candidates.length - pickedCount);
    this.setData({
      candidates,
      candidateCount: candidates.length,
      selectedIds: selected,
      pickedCount,
      restCount,
      laterLeft: restCount > 0 ? `其余 ${restCount} 件 → 本周稍后` : '候选都在这了',
      laterRight: restCount > 0 ? '不会丢' : `已选 ${pickedCount} 件`,
      step1Tip:
        candidates.length === 0
          ? '至少写下一件事，再开始挑三件。'
          : '不用清空所有事，先处理今天真正要在意的。',
      step2Tip:
        pickedCount === 0
          ? '至少留一件给今天。'
          : '三件之外的事，今天做是加分，不做也不算失败。',
    });
  },

  refreshCandidates() {
    const state = store.getState();
    const plan = store.getPlan();
    const taskMap = {};
    state.tasks.forEach((task) => {
      taskMap[task.id] = task;
    });
    const seen = {};
    const list = [];
    const push = (task) => {
      if (!task || task.status === 'done' || seen[task.id]) return;
      seen[task.id] = true;
      list.push(decorateTask(task));
    };
    store.getMits().forEach(push);
    plan.blocks.forEach((block) => {
      if (block.taskId) push(taskMap[block.taskId]);
    });
    store.getCollectTasks().forEach((task) => {
      if (task.status === 'inbox' || task.status === 'moved') push(task);
    });
    const allowed = {};
    list.forEach((task) => {
      allowed[task.id] = true;
    });
    const keep = this.selectedIds.filter((id) => allowed[id]);
    this.applySelection(list, keep);
  },

  defaultSelection() {
    const candidateIds = {};
    this.data.candidates.forEach((task) => {
      candidateIds[task.id] = true;
    });
    const ids = [];
    store.getMits().forEach((task) => {
      if (task.status === 'done' || !candidateIds[task.id]) return;
      if (ids.length >= 3 || ids.indexOf(task.id) >= 0) return;
      ids.push(task.id);
    });
    this.data.candidates.forEach((task) => {
      if (ids.length >= 3 || ids.indexOf(task.id) >= 0) return;
      ids.push(task.id);
    });
    return ids;
  },

  onDraftInput(event) {
    const value = event.detail.value;
    this.setData({ draft: value, canAdd: value.trim().length > 0 });
  },

  onAddDraft() {
    const title = (this.data.draft || '').trim();
    if (!title) return;
    store.addTask({ title, category: 'create', energy: 'mid' });
    this.setData({ draft: '', canAdd: false });
    this.refreshCandidates();
  },

  onQuickAdd(event) {
    const title = event.currentTarget.dataset.title;
    const exists = this.data.candidates.some((task) => task.title === title);
    if (exists) {
      store.toast('已经在候选里了');
      return;
    }
    store.addTask({ title, category: 'create', energy: 'mid' });
    this.refreshCandidates();
  },

  scrollTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  goStep2() {
    if (this.data.candidateCount === 0) return;
    if (!this.selectionInitialized) {
      this.selectionInitialized = true;
      this.applySelection(this.data.candidates, this.defaultSelection());
    }
    this.setData({ step: 2, stepKicker: STEP_KICKERS[2] });
    this.scrollTop();
  },

  onPick(event) {
    const id = event.currentTarget.dataset.id;
    const ids = this.selectedIds.slice();
    const index = ids.indexOf(id);
    if (index >= 0) {
      ids.splice(index, 1);
    } else {
      if (ids.length >= 3) {
        store.toast('今天只留三件');
        return;
      }
      ids.push(id);
    }
    this.applySelection(this.data.candidates, ids);
  },

  goStep3() {
    if (this.selectedIds.length === 0) {
      store.toast('至少留一件给今天');
      return;
    }
    this.setData({ step: 3, stepKicker: STEP_KICKERS[3] });
    this.buildSchedule(0);
    this.scrollTop();
  },

  onBack() {
    if (this.data.step === 1) {
      this.exit();
      return;
    }
    const step = this.data.step - 1;
    this.setData({ step, stepKicker: STEP_KICKERS[step] });
    this.scrollTop();
  },

  onClose() {
    this.exit();
  },

  exit() {
    const pages = getCurrentPages();
    if (pages.length <= 1) {
      wx.switchTab({ url: '/pages/today/today' });
      return;
    }
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/today/today' });
      },
    });
  },

  buildSchedule(offset) {
    const plan = store.getPlan();
    const settings = store.getSettings();
    const taskMap = {};
    this.data.candidates.forEach((task) => {
      taskMap[task.id] = task;
    });
    const tasks = this.selectedIds.map((id) => taskMap[id]).filter(Boolean);
    const result = schedule.buildSmartSchedule({
      date: store.getToday(),
      tasks: rotateTasks(tasks, offset),
      dayStartMin: settings.dayStartMin,
      dayEndMin: settings.dayEndMin,
      capacityMin: plan.capacityMin,
      bufferRatio: plan.bufferRatio,
      includeReview: true,
    });
    this.renderSchedule(result.blocks, result.unscheduledTaskIds, offset);
  },

  renderSchedule(blocks, unscheduledIds, offset) {
    const plan = store.getPlan();
    const settings = store.getSettings();
    const taskMap = {};
    this.data.candidates.forEach((task) => {
      taskMap[task.id] = task;
    });
    this.draftBlocks = blocks;
    this.unscheduledIds = unscheduledIds;
    const status = capacityStatus(blocks, plan.capacityMin);
    const decoratedBlocks = blocks.map((block) => decorateBlock(block, taskMap));
    const unscheduled = unscheduledIds
      .map((id) => taskMap[id])
      .filter(Boolean)
      .map((task) => ({
        id: task.id,
        title: task.title,
        durationText: task.durationText,
      }));
    const startText = minutesToTime(settings.dayStartMin);
    const endText = minutesToTime(settings.dayEndMin);
    this.setData({
      variant: offset,
      blocks: decoratedBlocks,
      unscheduled,
      capPlanned: formatMinutesLabel(status.plannedMin),
      capCapacity: formatMinutesLabel(status.capacityMin),
      capRemaining: formatMinutesLabel(status.remainingMin),
      capWidth: `${Math.min(100, Math.round(status.ratio * 100))}%`,
      capMeta:
        status.remainingMin > 0
          ? `留白 ${formatMinutesLabel(status.remainingMin)} 未动`
          : '容量已经排满',
      dayStartText: startText,
      dayEndText: endText,
      rangeText: `${startText} – ${endText}`,
    });
  },

  onReroll() {
    this.buildSchedule(this.data.variant + 1);
    store.toast('已重新排一版');
  },

  onMoveBlock(event) {
    const id = event.currentTarget.dataset.id;
    const target = (this.draftBlocks || []).find((block) => block.id === id);
    if (!target) return;
    const settings = store.getSettings();
    const duration = Math.max(5, target.endMin - target.startMin);
    const slot = schedule.findFreeSlot(
      this.draftBlocks,
      store.getToday(),
      duration,
      target.startMin + 15,
      settings.dayEndMin,
      target.id,
    );
    if (!slot) {
      store.toast('今天没有更晚的空位了');
      return;
    }
    const nextBlocks = sortBlocks(
      this.draftBlocks.map((block) =>
        block.id === id
          ? Object.assign({}, block, { startMin: slot.startMin, endMin: slot.endMin })
          : block,
      ),
    );
    this.renderSchedule(nextBlocks, this.unscheduledIds, this.data.variant);
    store.toast(`已换到 ${minutesToTime(slot.startMin)}`);
  },

  onCommitPlan() {
    store.commitPlan(this.draftBlocks || [], this.selectedIds);
    wx.switchTab({ url: '/pages/today/today' });
  },
});
