import type { DayRecord } from '../../types';
import { Icon } from '../../components/Icon';
import { formatMinutesLabel } from '../../lib/format';

interface ReviewScoreCardProps {
  record: DayRecord;
  reviewed: boolean;
  inProgress?: boolean;
  onPlan: () => void;
}

export function ReviewScoreCard({ record, reviewed, inProgress = false, onPlan }: ReviewScoreCardProps) {
  const hasPlan = record.totalTasks > 0 || record.plannedMin > 0;

  if (!hasPlan) {
    return (
      <section className="rv-score rv-score--empty" aria-label="今天还没有计划">
        <p className="rv-score__kicker">今日对账</p>
        <h2 className="rv-score__empty-title">今天还没有可对账的计划。</h2>
        <p className="rv-score__empty-text">
          先排下三件事和几个时间块，晚上回来只需一分钟。
        </p>
        <button
          className="btn btn--accent btn--sm rv-score__empty-action"
          type="button"
          onClick={onPlan}
        >
          <Icon name="calendar" size={14} />
          去规划今天
        </button>
      </section>
    );
  }

  const percent = Math.round(record.fulfillment * 100);
  const barWidth = `${Math.max(0, Math.min(100, percent))}%`;

  return (
    <section className="rv-score" aria-label={inProgress ? "当前兑现进度" : "时间兑现率"}>
      <div className="rv-score__top">
        <div>
          <p className="rv-score__label">{inProgress ? "当前兑现进度" : "时间兑现率"}</p>
          <p className="rv-score__big">
            {percent}
            <em>%</em>
          </p>
        </div>
        <span className="rv-score__tag">{reviewed ? '已收下' : inProgress ? '今天进行中' : '60 秒对账'}</span>
      </div>

      <div className="rv-score__bar" aria-hidden="true">
        <span style={{ width: barWidth }} />
      </div>

      <div className="rv-score__stats">
        <div>
          <span>任务完成</span>
          <b>
            {record.completedTasks} / {record.totalTasks}
          </b>
        </div>
        <div>
          <span>实际专注</span>
          <b>{formatMinutesLabel(record.actualMin)}</b>
        </div>
        <div>
          <span>计划总量</span>
          <b>{formatMinutesLabel(record.plannedMin)}</b>
        </div>
      </div>
    </section>
  );
}
