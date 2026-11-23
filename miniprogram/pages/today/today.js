const store = require('../../utils/store');
const { dateLabel, nowMinutes } = require('../../utils/date');
const {
  formatDuration,
  formatHours,
  formatMinutesLabel,
  minutesToTime,
} = require('../../utils/format');
const { trimCandidates } = require('../../utils/capacity');
const { buildTimeline } = require('../../utils/timeline');
const { CATEGORY_META, ENERGY_META } = require('../../utils/constants');

function taskMapOf(tasks) {
  const map = {};
  tasks.forEach((task) => {
    map[task.id] = task;
  });
  return map;
}

function kickerFor(kind) {
  if (kind === 'task') return '正在进行';
  if (kind === 'break') return '休息中';
  if (kind === 'buffer') return '留白中';
  return '仪式时间';
}

function restCopyFor(kind) {
  if (kind === 'buffer') return '这段时间留着，不排事。临时来的事，就放在这里。';
  if (kind === 'ritual') return '仪式时间。慢慢收个尾，不用再塞别的事。';
  return '先歇一会儿，不用急着开始下一件。';
}

function blockView(block, taskMap, currentMinute) {
  if (!block) return null;
  const task = block.taskId ? taskMap[block.taskId] : null;
  const categoryLabel = task ? CATEGORY_META[task.category].label : '';
  const startLabel = minutesToTime(block.startMin);
  const endLabel = minutesToTime(block.endMin);
  const durationLabel = formatDuration(block.endMin - block.startMin);
  const remainingLabel = formatMinutesLabel(Math.max(1, block.endMin - currentMinute));
  const done = Boolean((task && task.status === 'done') || block.completion === 'done');
  return {
    id: block.id,
    kind: block.kind,
    title: (task && task.title) || block.title,
    isTask: block.kind === 'task',
    done,
    startLabel,
    endLabel,
    categoryLabel,
    durationLabel,
    remainingLabel,
    kicker: kickerFor(block.kind),
    restCopy: restCopyFor(block.kind),
    currentMeta: `${remainingLabel} 后结束 · ${endLabel} 结束${categoryLabel ? ` · ${categoryLabel}` : ''}`,
    nextMeta: `${durationLabel} · ${startLabel} – ${endLabel}${categoryLabel ? ` · ${categoryLabel}` : ''}`,
  };
}

Page({
  data: {
    statusBarHeight: 20,
    dateText: '',
    streak: 0,
    greeting: '',
    name: '',
    over: false,
    capacityLead: '',
    capacitySub: '',
    capacityStatusLabel: '',
    capacityHours: '',
    plannedLabel: '',
    safePct: '0%',
    overPct: '0%',
    capacityNote: '',
    trimCount: 0,
    trimLabel: '无需移出',
    mits: [],
    mitDoneCount: 0,
    showNowSection: false,
    hasFocus: false,
    focusTitle: '',
    focusMeta: '',
    currentBlock: null,
    nextBlock: null,
    nowSectionTitle: '此刻',
    nowRangeText: '',
    timelineItems: [],
    timelineHours: [],
    timelineHeight: 0,
    nowTopRpx: 0,
    showNowLine: false,
    nowClock: '',
    dayRangeLabel: '',
    timelineEmptyText: '',
    pendingInboxCount: 0,
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
    this.startTicker();
  },

  onHide() {
    this.stopTicker();
  },

  onUnload() {
    this.stopTicker();
  },

  startTicker() {
    this.stopTicker();
    this.ticker = setInterval(() => {
      this.refresh();
    }, 60000);
  },

  stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  },

  refresh() {
    store.ensureToday();
    const now = store.getNow();
    const currentMinute = nowMinutes(now);
    const plan = store.getPlan();
    const settings = store.getSettings();
    const state = store.getState();
    const taskMap = taskMapOf(state.tasks);
    const capacity = store.getCapacity();
    const over = capacity.overMin > 0;
    const bufferRatio =
      plan.bufferRatio === undefined ? settings.bufferRatio : plan.bufferRatio;

    const bufferBlocksMin = plan.blocks.reduce(
      (total, block) =>
        block.kind === 'buffer'
          ? total + Math.max(0, block.endMin - block.startMin)
          : total,
      0,
    );
    const reservedBufferMin = Math.round(capacity.capacityMin * bufferRatio);
    const bufferMin =
      bufferBlocksMin > 0
        ? bufferBlocksMin
        : capacity.plannedMin > 0
          ? reservedBufferMin
          : 0;
    const safePct = over
      ? (capacity.capacityMin / Math.max(capacity.plannedMin, 1)) * 100
      : Math.min(1, capacity.ratio) * 100;
    const overPct = over
      ? (capacity.overMin / Math.max(capacity.plannedMin, 1)) * 100
      : 0;

    const trimCount = trimCandidates(plan.blocks, plan.capacityMin).length;
    const capacitySub = `已排 ${formatMinutesLabel(capacity.plannedMin)}${
      bufferMin > 0 ? ` · 留白 ${formatMinutesLabel(bufferMin)} 未动` : ''
    }`;
    let capacityNote = '刚好装满。留白先留着，临时的事有地方放。';
    if (over) {
      capacityNote = '今天排得比装得下的多一点。移出一些低优先的块就好，留白不要动。';
    } else if (capacity.remainingMin > 0) {
      capacityNote = `装得下，还有 ${formatMinutesLabel(
        capacity.remainingMin,
      )} 余量。留白先留着，临时的事有地方放。`;
    }

    const currentRaw = store.getCurrentBlock();
    const nowRaw =
      currentRaw ||
      plan.blocks.find(
        (block) =>
          block.startMin <= currentMinute && block.endMin > currentMinute,
      ) ||
      null;
    const nextRaw = store.getNextBlock();
    const currentBlock = blockView(nowRaw, taskMap, currentMinute);
    const nextBlock = blockView(nextRaw, taskMap, currentMinute);
    const focus = store.getFocus();
    const focusBlock = store.getFocusBlock();
    const focusTask = store.getFocusTask();
    const focusBlockId = focus ? focus.blockId : '';
    const focusCategoryLabel = focusTask
      ? CATEGORY_META[focusTask.category].label
      : '';

    const mits = store
      .getMits()
      .slice(0, 3)
      .map((task) => {
        const done = task.status === 'done';
        return {
          id: task.id,
          title: task.title,
          done,
          current: Boolean(
            !done && currentRaw && currentRaw.taskId === task.id,
          ),
          metaText: `${CATEGORY_META[task.category].label} · ${
            ENERGY_META[task.energy].label
          } · ${
            done
              ? `实际 ${formatDuration(task.actualMin || task.estimateMin)}`
              : `预估 ${formatDuration(task.estimateMin)}`
          }`,
        };
      });

    const timeline = buildTimeline(
      plan.blocks,
      settings.dayStartMin,
      settings.dayEndMin,
      currentMinute,
    );
    const timelineItems = timeline.items.map((item) => {
      const task = item.taskId ? taskMap[item.taskId] : null;
      const category = task ? task.category : '';
      const categoryLabel = category ? CATEGORY_META[category].label : '';
      const done = Boolean(
        (task && task.status === 'done') || item.completion === 'done',
      );
      const isCurrent = Boolean(
        item.isCurrent || (currentRaw && currentRaw.id === item.id),
      );
      const isFocusing = focusBlockId === item.id;
      const compact = item.heightRpx < 80;
      const metaParts = [`${item.startLabel}–${item.endLabel}`, item.durationLabel];
      if (item.kind === 'task') {
        if (categoryLabel) metaParts.push(categoryLabel);
      } else if (item.kind === 'break') {
        metaParts.push('不排事');
      } else if (item.kind === 'buffer') {
        metaParts.push('缓冲');
      } else if (item.kind === 'ritual') {
        metaParts.push('仪式');
      }
      const classes = ['today-tl-block', `today-tl-block--${item.kind}`];
      if (category) classes.push(`today-tl-block--${category}`);
      if (compact) classes.push('is-compact');
      if (isCurrent) classes.push('is-current');
      if (isFocusing) classes.push('is-focusing');
      if (done) classes.push('is-done');
      return {
        ...item,
        title: (task && task.title) || item.title,
        done,
        isCurrent,
        isFocusing,
        blockClass: classes.join(' '),
        metaText: metaParts.join(' · '),
      };
    });

    let nowSectionTitle = '此刻';
    let nowRangeText = '';
    if (!focus && currentBlock) {
      nowRangeText = `${currentBlock.startLabel} – ${currentBlock.endLabel}`;
    } else if (!focus && !currentBlock && nextBlock) {
      nowSectionTitle = '接下来';
      nowRangeText = `${nextBlock.startLabel} 开始`;
    }

    const pendingInboxCount = store
      .getCollectTasks()
      .filter((task) => task.status !== 'done').length;

    this.setData({
      dateText: dateLabel(now),
      streak: state.streak,
      greeting: store.getGreeting(),
      name: settings.name,
      over,
      capacityLead: `${formatHours(capacity.capacityMin)}h 可用`,
      capacitySub,
      capacityStatusLabel: over
        ? `超出 ${formatHours(capacity.overMin)}h`
        : '在容量内',
      capacityHours: formatHours(capacity.capacityMin),
      plannedLabel: formatMinutesLabel(capacity.plannedMin),
      safePct: `${safePct.toFixed(1)}%`,
      overPct: `${overPct.toFixed(1)}%`,
      capacityNote,
      trimCount,
      trimLabel:
        trimCount > 0
          ? `移出 ${trimCount} 项`
          : over
            ? '暂无可移出'
            : '无需移出',
      mits,
      mitDoneCount: mits.filter((item) => item.done).length,
      showNowSection: Boolean(focus) || plan.blocks.length > 0,
      hasFocus: Boolean(focus),
      focusTitle: focusTask
        ? focusTask.title
        : focusBlock
          ? focusBlock.title
          : '专注进行中',
      focusMeta: focusCategoryLabel
        ? `${focusCategoryLabel} · 先只做这一件`
        : '先只做这一件',
      currentBlock,
      nextBlock,
      nowSectionTitle,
      nowRangeText,
      timelineItems,
      timelineHours: timeline.hours,
      timelineHeight: timeline.heightRpx,
      nowTopRpx: timeline.nowTopRpx || 0,
      showNowLine: timeline.nowTopRpx !== null,
      nowClock: timeline.nowLabel,
      dayRangeLabel: `${minutesToTime(settings.dayStartMin)} – ${minutesToTime(
        settings.dayEndMin,
      )}`,
      timelineEmptyText:
        pendingInboxCount > 0
          ? `收集箱里还有 ${pendingInboxCount} 件待办。挑三件要紧的，先把今天排出来。`
          : '想到什么先记下来，再回来安排也不迟。',
      pendingInboxCount,
    });
  },

  onTrim() {
    store.trimOverload();
    this.refresh();
  },

  onToggleMit(event) {
    store.toggleTaskDone(event.currentTarget.dataset.id);
    this.refresh();
  },

  onStartBlock(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    if (store.startFocus(id)) {
      wx.navigateTo({ url: '/pages/focus/focus' });
    }
  },

  goFocus() {
    wx.navigateTo({ url: '/pages/focus/focus' });
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan?from=today' });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },
});
