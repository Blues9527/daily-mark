const { pad2 } = require('./date');

function minutesToTime(minutes) {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

function timeToMinutes(value) {
  const parts = value.split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
}

function formatDuration(minutes) {
  const value = Math.max(0, Math.round(minutes));
  if (value < 90 && value % 60 !== 0) return `${value}m`;
  if (value % 60 === 0) return `${value / 60}h`;
  return `${(value / 60).toFixed(1)}h`;
}

function formatHours(minutes) {
  const value = minutes / 60;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPercent(ratio) {
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

function formatMinutesLabel(minutes) {
  return minutes >= 60 ? `${formatHours(minutes)}h` : `${minutes}m`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

module.exports = {
  minutesToTime,
  timeToMinutes,
  formatDuration,
  formatHours,
  formatPercent,
  formatMinutesLabel,
  clamp,
};
