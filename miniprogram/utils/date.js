const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(key) {
  const parts = key.split('-');
  const year = Number(parts[0]);
  const month = parts[1] === undefined ? 1 : Number(parts[1]);
  const day = parts[2] === undefined ? 1 : Number(parts[2]);
  return new Date(year, month - 1, day);
}

function addDays(key, days) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function weekdayCN(date) {
  return WEEKDAYS[date.getDay()];
}

function dateLabel(date) {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdayCN(date)}`;
}

function dateLabelFromKey(key) {
  return dateLabel(parseDateKey(key));
}

function nowMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function startOfWeek(key) {
  const date = parseDateKey(key);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return dateKey(date);
}

function weekKeys(key) {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function lastNDays(key, n) {
  return Array.from({ length: n }, (_, index) => addDays(key, index - (n - 1)));
}

function isYesterday(previous, current) {
  if (!previous) return false;
  return addDays(previous, 1) === current;
}

function isTodayDate(value, today) {
  return value === today;
}

module.exports = {
  pad2,
  dateKey,
  parseDateKey,
  addDays,
  weekdayCN,
  dateLabel,
  dateLabelFromKey,
  nowMinutes,
  startOfWeek,
  weekKeys,
  lastNDays,
  isYesterday,
  isTodayDate,
};
