import type { DayStat } from '../../lib/stats';
import { formatHours, formatMinutesLabel } from '../../lib/format';

interface WeeklyChartProps {
  days: DayStat[];
  weekFocusMin: number;
  weekDeltaMin: number;
}

function deltaText(deltaMin: number): string {
  if (deltaMin === 0) return '与上周持平';
  const sign = deltaMin > 0 ? '+' : '−';
  return `比上周 ${sign}${formatHours(Math.abs(deltaMin))}h`;
}

export function WeeklyChart({ days, weekFocusMin, weekDeltaMin }: WeeklyChartProps) {
  const maxFocusMin = Math.max(...days.map((day) => day.focusMin), 1);
  const hasFocus = days.some((day) => day.focusMin > 0);
  const delta = deltaText(weekDeltaMin);

  return (
    <section className="card stats-card" aria-labelledby="stats-week-title">
      <div className="stats-card-head">
        <b id="stats-week-title">最近 7 天专注</b>
        <span className={`stats-delta${weekDeltaMin > 0 ? ' stats-delta--up' : ''}`}>
          {formatHours(weekFocusMin)}h · {delta}
        </span>
      </div>
      <div
        className="stats-chart"
        role="img"
        aria-label={`最近 7 天专注 ${formatHours(weekFocusMin)} 小时，${delta}`}
      >
        {days.map((day) => {
          const height = Math.min(100, (day.focusMin / maxFocusMin) * 100);
          return (
            <div
              key={day.date}
              className={`stats-chart-col${day.isToday ? ' is-today' : ''}${
                day.focusMin > 0 ? '' : ' is-empty'
              }`}
            >
              <div className="stats-chart-track">
                <div
                  className="stats-chart-bar"
                  style={{ height: `${height}%` }}
                  title={`${day.label} · ${
                    day.focusMin > 0 ? formatMinutesLabel(day.focusMin) : '没有专注'
                  }`}
                />
              </div>
              <span className="stats-chart-label">{day.label}</span>
            </div>
          );
        })}
      </div>
      {hasFocus ? null : (
        <p className="stats-chart-hint">这一周还没有专注记录，从今天的一小块开始。</p>
      )}
    </section>
  );
}
