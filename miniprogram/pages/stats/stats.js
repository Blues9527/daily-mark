const store = require('../../utils/store');
const { CATEGORY_META } = require('../../utils/constants');
const { formatHours, formatMinutesLabel } = require('../../utils/format');
const { parseDateKey } = require('../../utils/date');

const WEEK_TARGET = 7;
const DEEP_TARGET_MIN = 600;
const RECORD_TARGET = 7;

function shortDate(key) {
  const date = parseDateKey(key);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function deltaText(deltaMin) {
  if (deltaMin === 0) return '与上周持平';
  const sign = deltaMin > 0 ? '+' : '−';
  return `比上周 ${sign}${formatHours(Math.abs(deltaMin))}h`;
}

function intensityLevel(focusMin, maxFocusMin) {
  if (focusMin <= 0 || maxFocusMin <= 0) return 0;
  const ratio = focusMin / maxFocusMin;
  if (ratio <= 1 / 3) return 1;
  if (ratio <= 2 / 3) return 2;
  return 3;
}

function buildBadges(streak, totalDeepMin, recordedDays) {
  const deepRestMin = Math.max(0, DEEP_TARGET_MIN - totalDeepMin);
  return [
    {
      key: 'week',
      icon: '/assets/icons/spark-accent.png',
      title: '七日节奏',
      detail: streak >= WEEK_TARGET ? `已连续 ${streak} 天` : `再 ${WEEK_TARGET - streak} 天`,
      className: 'stats-badge' + (streak >= WEEK_TARGET ? '' : ' is-locked'),
    },
    {
      key: 'deep',
      icon: '/assets/icons/target-accent.png',
      title: '深度创作者',
      detail:
        totalDeepMin >= DEEP_TARGET_MIN
          ? `累计 ${formatHours(totalDeepMin)}h`
          : `还差 ${formatMinutesLabel(deepRestMin)}`,
      className: 'stats-badge' + (totalDeepMin >= DEEP_TARGET_MIN ? '' : ' is-locked'),
    },
    {
      key: 'records',
      icon: '/assets/icons/calendar-ink.png',
      title: '记录成册',
      detail: `已记录 ${recordedDays} 天`,
      className: 'stats-badge' + (recordedDays >= RECORD_TARGET ? '' : ' is-locked'),
    },
  ];
}

Page({
  data: {
    statusBarHeight: 20,
    streak: 0,
    range: '—',
    todayLine: '今天还没开始',
    weekFocusLabel: '0h',
    weekDeltaLabel: '与上周持平',
    chartDays: [],
    hasFocus: false,
    fulfillmentPercent: 0,
    createSharePercent: 0,
    hasMostOver: false,
    mostOverLabel: '',
    mostOverColor: '',
    calendarDays: [],
    calendarRange: '—',
    calendarTodayLabel: '',
    calendarActiveLabel: '还没有专注',
    hasActiveCalendar: false,
    badges: [],
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
    const dashboard = store.getDashboard();
    const todayRecord = store.getTodayRecord();
    const state = store.getState();
    const weekly = dashboard.weekly;
    const calendar = dashboard.calendar;

    const weekDates = {};
    weekly.forEach((day) => {
      weekDates[day.date] = true;
    });
    const weekRecords = state.history.filter((record) => weekDates[record.date]);
    const weekActualMin = weekRecords.reduce(
      (total, record) => total + record.actualMin,
      0,
    );
    const weekCreateMin = weekRecords.reduce(
      (total, record) => total + record.categories.create.actualMin,
      0,
    );
    const createShare =
      weekActualMin > 0 ? Math.min(1, weekCreateMin / weekActualMin) : 0;

    const maxFocusMin = Math.max(1, ...weekly.map((day) => day.focusMin));
    const chartDays = weekly.map((day) => ({
      date: day.date,
      label: day.label,
      heightPercent: Math.round((day.focusMin / maxFocusMin) * 100),
      className:
        'stats-chart-col' +
        (day.isToday ? ' is-today' : '') +
        (day.focusMin > 0 ? '' : ' is-empty'),
    }));

    const calendarMax = Math.max(0, ...calendar.map((day) => day.focusMin));
    const activeDays = calendar.filter((day) => day.focusMin > 0).length;
    const calendarDays = calendar.map((day) => ({
      date: day.date,
      className:
        'stats-cal-dot stats-cal-dot--' +
        intensityLevel(day.focusMin, calendarMax) +
        (day.isToday ? ' is-today' : ''),
    }));
    const lastDay = calendar.length ? calendar[calendar.length - 1] : null;
    const firstDay = calendar.length ? calendar[0] : null;

    const mostOver = dashboard.mostOverCategory;
    const delta = deltaText(dashboard.weekDeltaMin);
    const range =
      weekly.length > 0
        ? `${shortDate(weekly[0].date)} – ${shortDate(weekly[weekly.length - 1].date)}`
        : '—';

    this.setData({
      streak: dashboard.streak,
      range,
      todayLine:
        todayRecord.actualMin > 0
          ? `今天已记下 ${formatMinutesLabel(todayRecord.actualMin)}`
          : '今天还没开始',
      weekFocusLabel: `${formatHours(dashboard.weekFocusMin)}h`,
      weekDeltaLabel: delta,
      chartDays,
      hasFocus: weekly.some((day) => day.focusMin > 0),
      fulfillmentPercent: Math.round(dashboard.fulfillment * 100),
      createSharePercent: Math.round(createShare * 100),
      hasMostOver: Boolean(mostOver),
      mostOverLabel: mostOver ? CATEGORY_META[mostOver].label : '暂无',
      mostOverColor: mostOver ? CATEGORY_META[mostOver].color : '',
      calendarDays,
      calendarRange:
        firstDay && lastDay
          ? `${shortDate(firstDay.date)} – ${shortDate(lastDay.date)}`
          : '—',
      calendarTodayLabel: lastDay && lastDay.isToday ? '今天' : '',
      calendarActiveLabel:
        activeDays > 0 ? `${activeDays} 天有专注` : '还没有专注',
      hasActiveCalendar: activeDays > 0,
      badges: buildBadges(
        dashboard.streak,
        dashboard.totalDeepMin,
        dashboard.recordedDays,
      ),
    });
  },

  handleWeekly() {
    store.toast('周报将在下一版开放');
  },
});
