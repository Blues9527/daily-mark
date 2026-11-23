const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function weekdayCN(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

export function dateLabel(date: Date): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekdayCN(date)}`;
}

export function dateLabelFromKey(key: string): string {
  return dateLabel(parseDateKey(key));
}

export function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function startOfWeek(key: string): string {
  const date = parseDateKey(key);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return dateKey(date);
}

export function weekKeys(key: string): string[] {
  const start = startOfWeek(key);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function lastNDays(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, index) => addDays(key, index - (n - 1)));
}

export function isYesterday(previous: string | null, current: string): boolean {
  if (!previous) return false;
  return addDays(previous, 1) === current;
}

export function isTodayDate(value: string, today: string): boolean {
  return value === today;
}
