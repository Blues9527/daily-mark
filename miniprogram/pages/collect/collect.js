const store = require('../../utils/store');
const { formatDuration, clamp } = require('../../utils/format');
const {
  CATEGORY_META,
  CATEGORY_ORDER,
  ENERGY_META,
  ENERGY_ORDER,
} = require('../../utils/constants');

const CATEGORY_LABELS = CATEGORY_ORDER.map(
  (value) => CATEGORY_META[value].label,
);
const ENERGY_LABELS = ENERGY_ORDER.map((value) => ENERGY_META[value].label);
const FILTERS = [{ value: 'all', label: '全部' }].concat(
  CATEGORY_ORDER.map((value) => ({
    value,
    label: CATEGORY_META[value].label,
  })),
);

function draftOf(task, defaultEstimateMin) {
  const category = task ? task.category : 'create';
  const energy = task ? task.energy : 'mid';
  return {
    editingId: task ? task.id : '',
    formTitle: task ? task.title : '',
    formEstimate: String(task ? task.estimateMin : defaultEstimateMin),
    formCategory: category,
    formEnergy: energy,
    categoryIndex: Math.max(0, CATEGORY_ORDER.indexOf(category)),
    energyIndex: Math.max(0, ENERGY_ORDER.indexOf(energy)),
  };
}

Page({
  data: {
    statusBarHeight: 20,
    filters: FILTERS,
    filter: 'all',
    openCount: 0,
    tasks: [],
    sheetOpen: false,
    editingId: '',
    formTitle: '',
    formEstimate: '30',
    formCategory: 'create',
    formEnergy: 'mid',
    categoryIndex: 0,
    energyIndex: 1,
    categoryLabels: CATEGORY_LABELS,
    energyLabels: ENERGY_LABELS,
    categoryLabel: CATEGORY_META.create.label,
    energyLabel: ENERGY_META.mid.label,
    canSave: false,
    emptyTitle: '',
    emptyText: '',
  },

  onLoad() {
    const app = getApp();
    const statusBarHeight =
      (app && app.globalData && app.globalData.statusBarHeight) || 20;
    this.setData({ statusBarHeight });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  onHide() {
    if (this.data.sheetOpen) this.setData({ sheetOpen: false });
    this.showTabBar();
  },

  onUnload() {
    this.showTabBar();
  },

  hideTabBar() {
    if (!wx.hideTabBar) return;
    wx.hideTabBar({ animation: false, fail() {} });
  },

  showTabBar() {
    if (!wx.showTabBar) return;
    wx.showTabBar({ animation: false, fail() {} });
  },

  refresh(filterOverride) {
    store.ensureToday();
    const collectTasks = store.getCollectTasks();
    const openCount = collectTasks.filter(
      (task) => task.status !== 'done',
    ).length;
    const filter = filterOverride || this.data.filter;
    const filtered = collectTasks.filter(
      (task) => filter === 'all' || task.category === filter,
    );
    const ordered = filtered
      .filter((task) => task.status !== 'done')
      .concat(filtered.filter((task) => task.status === 'done'));
    const tasks = ordered.map((task) => {
      const categoryMeta = CATEGORY_META[task.category] || CATEGORY_META.create;
      const energyMeta = ENERGY_META[task.energy] || ENERGY_META.mid;
      return {
        id: task.id,
        title: task.title,
        done: task.status === 'done',
        color: categoryMeta.color,
        categoryLabel: categoryMeta.label,
        energyLabel: energyMeta.label,
        estimateLabel: formatDuration(task.estimateMin),
      };
    });
    const isAllEmpty = collectTasks.length === 0;

    this.setData({
      openCount,
      tasks,
      emptyTitle: isAllEmpty ? '收集箱还是空的' : '这一类还没有事情',
      emptyText: isAllEmpty
        ? '想到什么就先放进来，不用马上安排。之后可以再决定，什么时候做也可以。'
        : '换个筛选看看，或者现在记一条。',
    });
  },

  applyDraft(draft, extra) {
    this.setData(
      Object.assign(
        {
          editingId: draft.editingId,
          formTitle: draft.formTitle,
          formEstimate: draft.formEstimate,
          formCategory: draft.formCategory,
          formEnergy: draft.formEnergy,
          categoryIndex: draft.categoryIndex,
          energyIndex: draft.energyIndex,
          categoryLabel: CATEGORY_META[draft.formCategory].label,
          energyLabel: ENERGY_META[draft.formEnergy].label,
          canSave: draft.formTitle.trim().length > 0,
        },
        extra || {},
      ),
    );
  },

  openCreate() {
    const defaultEstimateMin = store.getSettings().defaultEstimateMin;
    this.applyDraft(draftOf(null, defaultEstimateMin), { sheetOpen: true });
    this.hideTabBar();
  },

  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const task = store.getCollectTasks().find((item) => item.id === id);
    if (!task) return;
    const defaultEstimateMin = store.getSettings().defaultEstimateMin;
    this.applyDraft(draftOf(task, defaultEstimateMin), { sheetOpen: true });
    this.hideTabBar();
  },

  closeSheet() {
    this.setData({ sheetOpen: false });
    this.showTabBar();
  },

  noop() {},

  onTitleInput(event) {
    const value = event.detail.value;
    this.setData({
      formTitle: value,
      canSave: value.trim().length > 0,
    });
  },

  onEstimateInput(event) {
    this.setData({ formEstimate: event.detail.value });
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value) || 0;
    const category = CATEGORY_ORDER[index] || 'create';
    this.setData({
      categoryIndex: index,
      formCategory: category,
      categoryLabel: CATEGORY_META[category].label,
    });
  },

  onEnergyChange(event) {
    const index = Number(event.detail.value) || 0;
    const energy = ENERGY_ORDER[index] || 'mid';
    this.setData({
      energyIndex: index,
      formEnergy: energy,
      energyLabel: ENERGY_META[energy].label,
    });
  },

  onFilter(event) {
    const value = event.currentTarget.dataset.value;
    if (value === this.data.filter) return;
    this.setData({ filter: value });
    this.refresh(value);
  },

  onToggleDone(event) {
    store.toggleTaskDone(event.currentTarget.dataset.id);
    this.refresh();
  },

  onSave() {
    const title = (this.data.formTitle || '').trim();
    if (!title) {
      store.toast('先写一句要做什么');
      return;
    }
    const raw = String(this.data.formEstimate).trim();
    const parsed = Number(raw);
    const estimateMin =
      raw === '' || !Number.isFinite(parsed)
        ? store.getSettings().defaultEstimateMin
        : clamp(Math.round(parsed), 5, 240);
    const values = {
      title,
      estimateMin,
      category: this.data.formCategory,
      energy: this.data.formEnergy,
    };
    if (this.data.editingId) {
      store.updateTask(this.data.editingId, values);
    } else {
      store.addTask(values);
    }
    this.setData({ sheetOpen: false, filter: 'all' });
    this.showTabBar();
    this.refresh('all');
  },

  onDelete() {
    const id = this.data.editingId;
    if (!id) return;
    wx.showModal({
      title: '删除这件事？',
      content: '删除后不能恢复，已经排进计划的块也会一起移出。',
      confirmText: '删除',
      confirmColor: '#b34a30',
      cancelText: '再想想',
      success: (res) => {
        if (!res.confirm) return;
        store.deleteTask(id);
        this.setData({ sheetOpen: false });
        this.showTabBar();
        this.refresh();
      },
    });
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan?from=collect' });
  },
});
