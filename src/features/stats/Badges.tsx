import { Icon, type IconName } from '../../components/Icon';
import { formatHours, formatMinutesLabel } from '../../lib/format';

interface BadgesProps {
  streak: number;
  totalDeepMin: number;
  recordedDays: number;
}

interface BadgeItem {
  key: string;
  icon: IconName;
  title: string;
  detail: string;
  unlocked: boolean;
}

const WEEK_TARGET = 7;
const DEEP_TARGET_MIN = 600;

export function Badges({ streak, totalDeepMin, recordedDays }: BadgesProps) {
  const deepRestMin = Math.max(0, DEEP_TARGET_MIN - totalDeepMin);
  const items: BadgeItem[] = [
    {
      key: 'week',
      icon: 'leaf',
      title: '七日节奏',
      detail: streak >= WEEK_TARGET ? `已连续 ${streak} 天` : `再 ${WEEK_TARGET - streak} 天`,
      unlocked: streak >= WEEK_TARGET,
    },
    {
      key: 'deep',
      icon: 'spark',
      title: '深度创作者',
      detail:
        totalDeepMin >= DEEP_TARGET_MIN
          ? `累计 ${formatHours(totalDeepMin)}h`
          : `还差 ${formatMinutesLabel(deepRestMin)}`,
      unlocked: totalDeepMin >= DEEP_TARGET_MIN,
    },
    {
      key: 'records',
      icon: 'calendar',
      title: '记录成册',
      detail: `已记录 ${recordedDays} 天`,
      unlocked: recordedDays >= 7,
    },
  ];

  return (
    <div className="stats-badges">
      {items.map((item) => (
        <article
          key={item.key}
          className={`stats-badge${item.unlocked ? '' : ' is-locked'}`}
        >
          <span className="stats-badge-icon">
            <Icon name={item.icon} size={13} />
          </span>
          <b>{item.title}</b>
          <span>{item.detail}</span>
        </article>
      ))}
    </div>
  );
}
