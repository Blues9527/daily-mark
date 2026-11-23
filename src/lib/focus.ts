import type { FocusSession } from '../types';

export function focusElapsedSeconds(session: FocusSession | null, now: Date): number {
  if (!session) return 0;
  const running =
    session.startedAt && !session.paused
      ? (now.getTime() - new Date(session.startedAt).getTime()) / 1000
      : 0;
  return Math.max(0, Math.floor(session.accumulatedSec + running));
}

export function focusRemainingSeconds(
  session: FocusSession | null,
  now: Date,
  plannedMin: number,
): number {
  const total = Math.max(0, plannedMin) * 60;
  return Math.max(0, total - focusElapsedSeconds(session, now));
}

export function focusProgress(
  session: FocusSession | null,
  now: Date,
  plannedMin: number,
): number {
  const total = Math.max(1, plannedMin * 60);
  return Math.min(1, focusElapsedSeconds(session, now) / total);
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
