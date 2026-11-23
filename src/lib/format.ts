import { pad2 } from './date';

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatDuration(minutes: number): string {
  const value = Math.max(0, Math.round(minutes));
  if (value < 90 && value % 60 !== 0) return `${value}m`;
  if (value % 60 === 0) return `${value / 60}h`;
  return `${(value / 60).toFixed(1)}h`;
}

export function formatHours(minutes: number): string {
  const value = minutes / 60;
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
}

export function formatMinutesLabel(minutes: number): string {
  return minutes >= 60 ? `${formatHours(minutes)}h` : `${minutes}m`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
