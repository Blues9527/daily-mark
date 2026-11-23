const store = require('../../utils/store');
const {
  focusElapsedSeconds,
  focusRemainingSeconds,
  focusProgress,
  formatClock,
} = require('../../utils/focus');
const { minutesToTime } = require('../../utils/format');
const { CATEGORY_META, ENERGY_META } = require('../../utils/constants');

const PRESETS = [15, 30, 45, 60];
const DISTRACTION_TYPES = [
  { value: 'idea', label: '想法' },
  { value: 'todo', label: '待办' },
  { value: 'feeling', label: '情绪' },
];
const DISTRACTION_LABELS = {
  idea: '想法',
  todo: '待办',
  feeling: '情绪',
};

function partialButtonText(minutes, valid) {
  return valid ? `记录 ${minutes} 分钟并结束` : '记录并结束本段';
}

Page({
  data: {
    statusBarHeight: 20,
    hasFocus: false,
    paused: false,
    statusLabel: '专注中',
    timeRange: '',
    title: '',
    categoryLabel: '仪式时间',
    categoryColor: '#e98a63',
    energyLabel: '',
    plannedMin: 1,
    remainingText: '00:00',
    ringLabel: '剩余',
    elapsedMin: 0,
    progress: 0,
    ringSize: 240,
    distractionText: '',
    distractionCanSubmit: false,
    distractionType: 'idea',
    distractionTypes: DISTRACTION_TYPES,
    distractions: [],
    partialOpen: false,
    partialValue: '',
    partialMinutes: 0,
    partialValid: false,
    partialHint: '',
    partialButtonText: '记录并结束本段',
    presets: PRESETS,
  },

  onLoad() {
    const app = getApp();
    const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
    let windowWidth = 375;
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      windowWidth = info.windowWidth || 375;
    } catch (error) {
      windowWidth = 375;
    }
    const ringSize = Math.max(200, Math.min(260, Math.round(windowWidth * 0.64)));
    this.setData({
      statusBarHeight,
      ringSize,
    });
    store.ensureToday();
  },

  onShow() {
    store.ensureToday();
    this.syncFocus();
    if (store.getFocus() && store.getFocusBlock()) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  },

  onReady() {
    if (this.data.hasFocus) this.updateClock();
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.updateClock();
    }, 1000);
  },

  stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  syncFocus() {
    const focus = store.getFocus();
    const block = focus ? store.getFocusBlock() : null;
    if (!focus || !block) {
      this.stopTimer();
      this.setData({ hasFocus: false, distractions: [] });
      return;
    }
    const task = store.getFocusTask();
    const category = task ? CATEGORY_META[task.category] || CATEGORY_META.create : null;
    const energy = task ? ENERGY_META[task.energy] || ENERGY_META.mid : null;
    this.setData(
      {
        hasFocus: true,
        timeRange: `${minutesToTime(block.startMin)} – ${minutesToTime(block.endMin)}`,
        title: task ? task.title : block.title,
        categoryLabel: category ? category.label : '仪式时间',
        categoryColor: category ? category.color : '#e98a63',
        energyLabel: energy ? energy.label : '',
      },
      () => {
        this.updateClock();
        this.syncDistractions();
      },
    );
  },

  updateClock() {
    const focus = store.getFocus();
    const block = focus ? store.getFocusBlock() : null;
    if (!focus || !block) {
      this.stopTimer();
      this.setData({ hasFocus: false });
      return;
    }
    const plannedMin = Math.max(1, block.endMin - block.startMin);
    const now = new Date();
    const elapsedSec = focusElapsedSeconds(focus, now);
    const remainingSec = focusRemainingSeconds(focus, now, plannedMin);
    const progress = focusProgress(focus, now, plannedMin);
    const paused = Boolean(focus.paused);
    this.setData(
      {
        paused,
        statusLabel: paused ? '已暂停' : '专注中',
        plannedMin,
        remainingText: formatClock(remainingSec),
        ringLabel: paused ? '已暂停' : remainingSec <= 0 ? '计划时间到' : '剩余',
        elapsedMin: Math.floor(elapsedSec / 60),
        progress,
      },
      () => {
        this.drawRing();
      },
    );
  },

  drawRing() {
    if (!this.data.hasFocus) return;
    const pxSize = this.data.ringSize;
    if (!pxSize) return;
    const stroke = 7;
    const center = pxSize / 2;
    const radius = (pxSize - stroke) / 2;
    const progress = Math.max(0, Math.min(1, this.data.progress));
    const context = wx.createCanvasContext('focusRing', this);
    context.clearRect(0, 0, pxSize, pxSize);
    context.setLineWidth(stroke);
    context.setLineCap('round');
    context.beginPath();
    context.setStrokeStyle('rgba(245, 239, 228, 0.1)');
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();
    if (progress > 0) {
      context.beginPath();
      context.setStrokeStyle(this.data.paused ? 'rgba(217, 91, 51, 0.42)' : '#d95b33');
      context.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      context.stroke();
    }
    context.setTextAlign('center');
    context.setTextBaseline('middle');
    context.setFillStyle('#f5efe4');
    context.setFontSize(Math.round(pxSize * 0.22));
    context.fillText(this.data.remainingText, center, center - 4);
    context.setFillStyle('rgba(245, 239, 228, 0.55)');
    context.setFontSize(Math.max(10, Math.round(pxSize * 0.055)));
    context.fillText(this.data.ringLabel, center, center + pxSize * 0.16);
    context.draw();
  },

  handleBack() {
    this.goToday();
  },

  goToday() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        fail() {
          wx.switchTab({ url: '/pages/today/today' });
        },
      });
      return;
    }
    wx.switchTab({ url: '/pages/today/today' });
  },

  togglePause() {
    if (!store.getFocus()) {
      this.syncFocus();
      return;
    }
    store.toggleFocusPause();
    this.updateClock();
  },

  handleDone() {
    if (!store.getFocus()) {
      this.goToday();
      return;
    }
    store.completeFocus('done');
    this.stopTimer();
    this.goToday();
  },

  openPartial() {
    const focus = store.getFocus();
    const block = store.getFocusBlock();
    if (!focus || !block) return;
    const plannedMin = Math.max(1, block.endMin - block.startMin);
    const elapsedSec = focusElapsedSeconds(focus, new Date());
    const elapsedMin = Math.floor(elapsedSec / 60);
    const suggestion = Math.min(plannedMin, Math.max(1, Math.round(elapsedSec / 60) || 30));
    this.setData({
      partialOpen: true,
      partialValue: String(suggestion),
      partialMinutes: suggestion,
      partialValid: true,
      partialHint: `这一段实际推进了多久？已专注约 ${elapsedMin} 分钟，计划 ${plannedMin} 分钟。`,
      partialButtonText: partialButtonText(suggestion, true),
    });
  },

  closePartial() {
    this.setData({ partialOpen: false });
  },

  stopSheetTap() {},

  applyPartialValue(value) {
    const parsed = Number(value);
    const valid = Number.isFinite(parsed) && parsed >= 1;
    const minutes = valid ? Math.round(parsed) : 0;
    this.setData({
      partialValue: value,
      partialMinutes: minutes,
      partialValid: valid,
      partialButtonText: partialButtonText(minutes, valid),
    });
  },

  onPartialInput(event) {
    this.applyPartialValue(event.detail.value);
  },

  onPartialPreset(event) {
    const minutes = Number(event.currentTarget.dataset.minutes);
    this.applyPartialValue(String(minutes));
  },

  confirmPartial() {
    if (!this.data.partialValid) return;
    const minutes = this.data.partialMinutes;
    this.setData({ partialOpen: false });
    store.completeFocus('partial', minutes);
    this.stopTimer();
    this.goToday();
  },

  onDistractionInput(event) {
    const value = event.detail.value;
    this.setData({
      distractionText: value,
      distractionCanSubmit: value.trim().length > 0,
    });
  },

  onTypePick(event) {
    this.setData({ distractionType: event.currentTarget.dataset.value });
  },

  onCapture() {
    const text = (this.data.distractionText || '').trim();
    if (!text || !store.getFocus()) return;
    store.captureDistraction(text, this.data.distractionType);
    this.setData({ distractionText: '', distractionCanSubmit: false });
    this.syncDistractions();
  },

  syncDistractions() {
    const focus = store.getFocus();
    const block = focus ? store.getFocusBlock() : null;
    if (!focus || !block) {
      this.setData({ distractions: [] });
      return;
    }
    const distractions = store
      .getState()
      .distractions.filter((item) => item.blockId === block.id && !item.handled)
      .map((item) =>
        Object.assign({}, item, {
          typeLabel: DISTRACTION_LABELS[item.type] || '想法',
        }),
      );
    this.setData({ distractions });
  },

  onPromote(event) {
    store.promoteDistraction(event.currentTarget.dataset.id);
    this.syncDistractions();
  },
});
