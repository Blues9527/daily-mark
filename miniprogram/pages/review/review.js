const store = require('../../utils/store');
const { CATEGORY_META, CATEGORY_ORDER } = require('../../utils/constants');
const { REVIEW_REASONS } = require('../../utils/review');
const { dateLabel } = require('../../utils/date');
const { formatMinutesLabel, formatHours } = require('../../utils/format');

const MAX_REASONS = 2;

function buildChips(reasons) {
  const atLimit = reasons.length >= MAX_REASONS;
  return REVIEW_REASONS.map((label) => {
    const active = reasons.indexOf(label) >= 0;
    const locked = !active && atLimit;
    return {
      label,
      className:
        'chip chip-accent' +
        (active ? ' chip-active' : '') +
        (locked ? ' is-locked' : ''),
    };
  });
}

function reasonHint(reasons) {
  if (reasons.length === 0) return '不选也能保存，挑一个最接近的原因就好。';
  if (reasons.length >= MAX_REASONS) return '已选两个，再点一次可以取消。';
  return '还能再选一个，或者直接往下。';
}

function buildCategoryRows(categories) {
  const rows = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_META[category].label,
    color: CATEGORY_META[category].color,
    plannedMin: categories[category].plannedMin,
    actualMin: categories[category].actualMin,
  })).filter((row) => row.plannedMin > 0 || row.actualMin > 0);

  const scale = Math.max(1, ...rows.map((row) => Math.max(row.plannedMin, row.actualMin)));

  return rows.map((row) => ({
    category: row.category,
    label: row.label,
    color: row.color,
    planWidth:
      row.plannedMin > 0 ? Math.max(2, Math.round((row.plannedMin / scale) * 100)) : 0,
    actualWidth:
      row.actualMin > 0 ? Math.max(2, Math.round((row.actualMin / scale) * 100)) : 0,
    planLabel: formatMinutesLabel(row.plannedMin),
    actualLabel: formatMinutesLabel(row.actualMin),
  }));
}

Page({
  data: {
    statusBarHeight: 20,
    dateLabel: '',
    streak: 0,
    reviewed: false,
    inProgress: false,
    hasPlan: false,
    percent: 0,
    completedTasks: 0,
    totalTasks: 0,
    actualLabel: '0m',
    plannedLabel: '0m',
    scoreLabel: '时间兑现率',
    scoreTag: '60 秒对账',
    categoryRows: [],
    reasons: [],
    chips: [],
    reasonHint: '',
    suggestion: null,
    hasSuggestion: false,
    suggestionTitle: '',
    suggestionReason: '',
    accepted: false,
    saveLabel: '收下今天',
    submitNote: '',
    note: '',
    noteLength: 0,
  },

  onLoad() {
    const app = getApp();
    this.setData({
      statusBarHeight: (app.globalData && app.globalData.statusBarHeight) || 20,
    });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    store.ensureToday();
    const now = store.getNow();
    const record = store.getTodayRecord();
    const review = store.getTodayReview();
    const suggestion = store.getSuggestion();
    const reviewed = Boolean(review);
    const inProgress = !reviewed && now.getHours() < 18;
    const hasPlan = record.totalTasks > 0 || record.plannedMin > 0;
    const reasons =
      review && review.reasons ? review.reasons.slice(0, MAX_REASONS) : [];
    const accepted = Boolean(review && review.acceptedSuggestion && suggestion);
    const note = review && review.note ? review.note : '';

    const next = {
      dateLabel: dateLabel(now),
      streak: store.getState().streak,
      reviewed,
      inProgress,
      hasPlan,
      percent: Math.round(record.fulfillment * 100),
      completedTasks: record.completedTasks,
      totalTasks: record.totalTasks,
      actualLabel: formatMinutesLabel(record.actualMin),
      plannedLabel: formatMinutesLabel(record.plannedMin),
      scoreLabel: inProgress ? '当前兑现进度' : '时间兑现率',
      scoreTag: reviewed ? '已收下' : inProgress ? '今天进行中' : '60 秒对账',
      categoryRows: buildCategoryRows(record.categories),
      reasons,
      chips: buildChips(reasons),
      reasonHint: reasonHint(reasons),
      suggestion,
      hasSuggestion: Boolean(suggestion),
      suggestionTitle: suggestion
        ? `明天把容量降到 ${formatHours(suggestion.suggestedMin)} 小时？`
        : '',
      suggestionReason: suggestion ? suggestion.reason : '',
      accepted,
      saveLabel: reviewed
        ? '更新今天的复盘'
        : inProgress
          ? '记下当前进度'
          : hasPlan
            ? '收下今天'
            : '记下今天',
      submitNote: reviewed
        ? '再保存会更新今天的记录，不会多算一天。'
        : '复盘只保存在本机，不会公开。',
      note,
      noteLength: note.length,
    };

    if (this.formEdited) {
      next.reasons = this.data.reasons;
      next.chips = this.data.chips;
      next.reasonHint = this.data.reasonHint;
      next.note = this.data.note;
      next.noteLength = this.data.noteLength;
      next.accepted = this.data.accepted;
    }

    this.setData(next);
  },

  toggleReason(event) {
    this.formEdited = true;
    const reason = event.currentTarget.dataset.reason;
    const reasons = this.data.reasons.slice();
    const index = reasons.indexOf(reason);
    if (index >= 0) {
      reasons.splice(index, 1);
    } else if (reasons.length < MAX_REASONS) {
      reasons.push(reason);
    }
    this.setData({
      reasons,
      chips: buildChips(reasons),
      reasonHint: reasonHint(reasons),
    });
  },

  onNoteInput(event) {
    this.formEdited = true;
    const note = event.detail.value || '';
    this.setData({ note, noteLength: note.length });
  },

  acceptSuggestion() {
    this.formEdited = true;
    this.setData({ accepted: true });
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan' });
  },

  handleSave() {
    this.formEdited = false;
    const suggestion = this.data.suggestion;
    const accepted = Boolean(this.data.accepted && suggestion);
    store.saveReview({
      reasons: this.data.reasons,
      note: this.data.note,
      acceptedSuggestion: accepted,
      tomorrowCapacityMin: accepted ? suggestion.suggestedMin : null,
    });
    wx.switchTab({ url: '/pages/stats/stats' });
  },
});
