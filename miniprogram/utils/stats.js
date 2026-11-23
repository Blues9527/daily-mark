const { addDays, lastNDays, dateLabelFromKey, parseDateKey } = require('./date');
const { computeDayRecord } = require('./review');

function recordForDate(date, today, state, plan, tasks) {
  const stored = state.history.find((record) => record.date === date);
  if (stored) return stored;
  if (date === today) return computeDayRecord(plan, tasks);
  return null;
}

function dayLabel(date, today) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  if (date === today) return '今';
  return weekdays[parseDateKey(date).getDay()];
}

function computeDashboard(state, plan, tasks, today) {
  const currentWeek = lastNDays(today, 7);
  const previousWeek = currentWeek.map((date) => addDays(date, -7));
  const calendarDates = lastNDays(today, 14);

  const weekly = currentWeek.map((date) => {
    const record = recordForDate(date, today, state, plan, tasks);
    return {
      date,
      label: dayLabel(date, today),
      focusMin: record ? record.actualMin : 0,
      plannedMin: record ? record.plannedMin : 0,
      fulfillment: record ? record.fulfillment : 0,
      reviewed: Boolean(state.reviews[date]),
      isToday: date === today,
      isFuture: date > today,
    };
  });

  const calendar = calendarDates.map((date) => {
    const record = recordForDate(date, today, state, plan, tasks);
    return {
      date,
      label: dateLabelFromKey(date),
      focusMin: record ? record.actualMin : 0,
      plannedMin: record ? record.plannedMin : 0,
      fulfillment: record ? record.fulfillment : 0,
      reviewed: Boolean(state.reviews[date]),
      isToday: date === today,
      isFuture: date > today,
    };
  });

  const lastWeekFocusMin = state.history
    .filter((record) => previousWeek.includes(record.date))
    .reduce((total, record) => total + record.actualMin, 0);
  const weekFocusMin = weekly.reduce((total, day) => total + day.focusMin, 0);
  const weekPlannedMin = weekly.reduce((total, day) => total + day.plannedMin, 0);

  const recorded = calendar.filter((day) => day.plannedMin > 0 || day.focusMin > 0);
  const fulfillment = recorded.length
    ? recorded.reduce((total, day) => total + day.fulfillment, 0) / recorded.length
    : 0;

  const overCounts = new Map();
  const recentRecords = state.history.slice(-14);
  recentRecords.forEach((record) => {
    Object.keys(record.categories).forEach((category) => {
      const minutes = record.categories[category];
      if (minutes.actualMin > minutes.plannedMin + 15) {
        overCounts.set(category, (overCounts.get(category) || 0) + 1);
      }
    });
  });
  const overEntries = [...overCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostOverCategory = overEntries.length ? overEntries[0][0] : null;

  return {
    weekly,
    weekFocusMin,
    lastWeekFocusMin,
    weekDeltaMin: weekFocusMin - lastWeekFocusMin,
    fulfillment,
    mostOverCategory,
    streak: state.streak,
    calendar,
    totalFocusMin: state.history.reduce((total, record) => total + record.actualMin, 0),
    totalDeepMin: state.history.reduce((total, record) => total + record.deepMin, 0),
    recordedDays: state.history.length,
    weekPlannedMin,
  };
}

module.exports = {
  computeDashboard,
};
