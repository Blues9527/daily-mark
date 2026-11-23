function focusElapsedSeconds(session, now) {
  if (!session) return 0;
  const running =
    session.startedAt && !session.paused
      ? (now.getTime() - new Date(session.startedAt).getTime()) / 1000
      : 0;
  return Math.max(0, Math.floor(session.accumulatedSec + running));
}

function focusRemainingSeconds(session, now, plannedMin) {
  const total = Math.max(0, plannedMin) * 60;
  return Math.max(0, total - focusElapsedSeconds(session, now));
}

function focusProgress(session, now, plannedMin) {
  const total = Math.max(1, plannedMin * 60);
  return Math.min(1, focusElapsedSeconds(session, now) / total);
}

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

module.exports = {
  focusElapsedSeconds,
  focusRemainingSeconds,
  focusProgress,
  formatClock,
};
