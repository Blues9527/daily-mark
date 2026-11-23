import { formatClock } from '../../lib/focus';

interface FocusRingProps {
  remainingSec: number;
  progress: number;
  paused: boolean;
}

const SIZE = 240;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FocusRing({ remainingSec, progress, paused }: FocusRingProps) {
  const ratio = Math.max(0, Math.min(1, progress));
  const offset = CIRCUMFERENCE * (1 - ratio);
  const label = paused ? '已暂停' : remainingSec <= 0 ? '计划时间到' : '剩余';

  return (
    <div
      className={`focus-timer${paused ? ' is-paused' : ''}`}
      role="timer"
      aria-live="off"
      aria-label={paused ? '专注已暂停' : `剩余 ${formatClock(remainingSec)}`}
    >
      <svg className="focus-ring-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <defs>
          <linearGradient id="focus-arc-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e98a63" />
            <stop offset="100%" stopColor="#d95b33" />
          </linearGradient>
        </defs>
        <circle
          className="focus-ring-track"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          className="focus-ring-arc"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </svg>
      <div className="focus-ring-center">
        <span className="focus-ring-time">{formatClock(remainingSec)}</span>
        <span className="focus-ring-label">{label}</span>
      </div>
    </div>
  );
}
