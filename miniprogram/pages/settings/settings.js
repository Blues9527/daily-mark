const store = require('../../utils/store');
const { formatHours, minutesToTime, timeToMinutes } = require('../../utils/format');

function toDraft(settings) {
  return {
    name: settings.name,
    capacity: String(settings.capacityMin),
    buffer: Math.round(settings.bufferRatio * 100),
    dayStart: minutesToTime(settings.dayStartMin),
    dayEnd: minutesToTime(settings.dayEndMin),
    defaultEstimate: String(settings.defaultEstimateMin),
  };
}

function capacityLabel(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? `${formatHours(num)} 小时` : '待填写';
}

function estimateLabel(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? `${Math.round(num)} 分钟` : '待填写';
}

Page({
  data: {
    statusBarHeight: 20,
    name: '',
    capacity: '',
    buffer: 20,
    dayStart: '09:00',
    dayEnd: '21:30',
    defaultEstimate: '',
    capacityHours: '',
    bufferLabel: '20%',
    spanLabel: '时间范围',
    estimateLabel: '',
    error: '',
  },

  onLoad() {
    const app = getApp();
    const draft = toDraft(store.getSettings());
    this.setData({
      statusBarHeight: (app.globalData && app.globalData.statusBarHeight) || 20,
      name: draft.name,
      capacity: draft.capacity,
      buffer: draft.buffer,
      dayStart: draft.dayStart,
      dayEnd: draft.dayEnd,
      defaultEstimate: draft.defaultEstimate,
    });
    this.syncLabels(draft);
  },
  syncLabels(patch) {
    const data = Object.assign({}, this.data, patch || {});
    const bufferValue = Number(data.buffer);
    const start = data.dayStart ? timeToMinutes(data.dayStart) : 0;
    const end = data.dayEnd ? timeToMinutes(data.dayEnd) : 0;
    this.setData({
      capacityHours: capacityLabel(data.capacity),
      bufferLabel: `${Math.round(bufferValue)}%`,
      spanLabel:
        data.dayStart && data.dayEnd && end > start
          ? `共 ${formatHours(end - start)} 小时`
          : '时间范围',
      estimateLabel: estimateLabel(data.defaultEstimate),
    });
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value, error: '' });
  },

  onCapacityInput(event) {
    const value = event.detail.value;
    this.setData({ capacity: value, error: '' });
    this.syncLabels({ capacity: value });
  },

  onBufferChange(event) {
    const value = event.detail.value;
    this.setData({ buffer: value, error: '' });
    this.syncLabels({ buffer: value });
  },

  onStartChange(event) {
    const value = event.detail.value;
    this.setData({ dayStart: value, error: '' });
    this.syncLabels({ dayStart: value });
  },

  onEndChange(event) {
    const value = event.detail.value;
    this.setData({ dayEnd: value, error: '' });
    this.syncLabels({ dayEnd: value });
  },

  onEstimateInput(event) {
    const value = event.detail.value;
    this.setData({ defaultEstimate: value, error: '' });
    this.syncLabels({ defaultEstimate: value });
  },

  handleBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.switchTab({ url: '/pages/today/today' });
  },

  handleSave() {
    const capacity = Number(this.data.capacity);
    const buffer = Number(this.data.buffer);
    const defaultEstimate = Number(this.data.defaultEstimate);
    const start = this.data.dayStart ? timeToMinutes(this.data.dayStart) : null;
    const end = this.data.dayEnd ? timeToMinutes(this.data.dayEnd) : null;

    if (!Number.isFinite(capacity) || capacity < 60 || capacity > 720) {
      this.setData({ error: '每日容量需要填 60–720 分钟。' });
      return;
    }
    if (!Number.isFinite(buffer) || buffer < 10 || buffer > 40) {
      this.setData({ error: '留白比例需要在 10%–40% 之间。' });
      return;
    }
    if (!Number.isFinite(defaultEstimate) || defaultEstimate < 5 || defaultEstimate > 240) {
      this.setData({ error: '默认预估需要在 5–240 分钟之间。' });
      return;
    }
    if (start === null || end === null) {
      this.setData({ error: '开始和结束时间都要填。' });
      return;
    }
    if (end <= start) {
      this.setData({ error: '结束时间需要晚于开始时间。' });
      return;
    }

    store.updateSettings({
      name: this.data.name.trim() || store.getSettings().name,
      capacityMin: Math.round(capacity),
      bufferRatio: Math.round(buffer) / 100,
      dayStartMin: start,
      dayEndMin: end,
      defaultEstimateMin: Math.round(defaultEstimate),
    });
    store.toast('设置已保存');
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.switchTab({ url: '/pages/today/today' });
      },
    });
  },

  handleReset() {
    wx.showModal({
      title: '重置演示数据',
      content: '会清空这台设备上的任务、计划、复盘与设置。',
      confirmText: '确认重置',
      confirmColor: '#b34a30',
      success(res) {
        if (!res.confirm) return;
        store.resetDemo();
        wx.switchTab({ url: '/pages/today/today' });
      },
    });
  },
});
