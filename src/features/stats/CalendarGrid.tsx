import type { DayStat } from '../../lib/stats';
import { formatMinutesLabel } from '../../lib/format';
import { parseDateKey } from '../../lib/date';

interface CalendarGridProps {
  days: DayStat[];
}

function shortDate(key: string): string {
  const date = parseDateKey(key);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function intensity(focusMin: number, maxFocusMin: number): 0 | 1 | 2 | 3 {
  if (focusMin <= 0 || maxFocusMin <= 0) return 0;
  const ratio = focusMin / maxFocusMin;
  if (ratio <= 1 / 3) return 1;
  if (ratio <= 2 / 3) return 2;
  return 3;
}

export function CalendarGrid({ days }: CalendarGridProps) {
  const maxFocusMin = Math.max(...days.map((day) => day.focusMin), 0);
  const activeDays = days.filter((day) => day.focusMin > 0).length;
  const startDate = days.length > 0 ? shortDate(days[0].date) : '—';
  const endDay = days.length > 0 ? days[days.length - 1] : null;

  return (
    <section className="card stats-card" aria-labelledby="stats-calendar-title">
      <div className="stats-card-head">
        <b id="stats-calendar-title">最近 14 天</b>
        <span>{activeDays > 0 ? `${activeDays} 天有专注` : '还没有专注'}</span>
      </div>
      <div
        className="stats-cal-grid"
        role="img"
        aria-label={
          activeDays > 0
            ? `最近 14 天中有 ${activeDays} 天留下专注记录`
            : '最近 14 天还没有专注记录'
        }
      >
        {days.map((day) => {
          const level = intensity(day.focusMin, maxFocusMin);
          return (
            <span
              key={day.date}
              className={`stats-cal-dot stats-cal-dot--${level}${
                day.isToday ? ' is-today' : ''
              }`}
              title={`${day.label} · ${
                day.focusMin > 0 ? formatMinutesLabel(day.focusMin) : '没有专注'
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div className="stats-cal-foot">
        <span>
          {startDate}
          {endDay ? ` – ${shortDate(endDay.date)}` : ''}
        </span>
        <span className="stats-cal-today">{endDay?.isToday ? '今天' : ''}</span>
      </div>
      {activeDays === 0 ? (
        <p className="stats-cal-hint">记下今天的一小块，点阵就会亮起来。</p>
      ) : null}
    </section>
  );
}
