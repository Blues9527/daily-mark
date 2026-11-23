import type { Block, CapacityStatus } from '../../types';
import { Icon } from '../../components/Icon';
import { formatHours, formatMinutesLabel } from '../../lib/format';

interface CapacityCardProps {
  capacity: CapacityStatus;
  bufferRatio: number;
  blocks: Block[];
  trimCount: number;
  onTrim: () => void;
  onReplan: () => void;
}

export function CapacityCard({
  capacity,
  bufferRatio,
  blocks,
  trimCount,
  onTrim,
  onReplan,
}: CapacityCardProps) {
  const { capacityMin, plannedMin, remainingMin, overMin, ratio } = capacity;
  const over = overMin > 0;
  const bufferBlocksMin = blocks
    .filter((block) => block.kind === 'buffer')
    .reduce((total, block) => total + Math.max(0, block.endMin - block.startMin), 0);
  const reservedBufferMin = Math.round(capacityMin * bufferRatio);
  const bufferMin =
    bufferBlocksMin > 0 ? bufferBlocksMin : plannedMin > 0 ? reservedBufferMin : 0;
  const safePct = over ? (capacityMin / Math.max(plannedMin, 1)) * 100 : Math.min(1, ratio) * 100;
  const overPct = over ? (overMin / Math.max(plannedMin, 1)) * 100 : 0;

  return (
    <section className="card cap-card" aria-label="今日容量">
      <div className="cap-head">
        <div>
          <p className="cap-lead">{formatHours(capacityMin)}h 可用</p>
          <p className="cap-sub">
            已排 {formatMinutesLabel(plannedMin)}
            {bufferMin > 0 ? ` · 留白 ${formatMinutesLabel(bufferMin)} 未动` : ''}
          </p>
        </div>
        <span className={`cap-status${over ? ' cap-status--over' : ' cap-status--safe'}`}>
          {over ? `超出 ${formatHours(overMin)}h` : '在容量内'}
        </span>
      </div>

      <div
        className={`cap-bar${over ? ' is-over' : ''}`}
        role="img"
        aria-label={
          over
            ? `已排 ${formatMinutesLabel(plannedMin)}，超出容量 ${formatMinutesLabel(overMin)}`
            : `已排 ${formatMinutesLabel(plannedMin)}，容量 ${formatMinutesLabel(capacityMin)}`
        }
      >
        <span className="cap-fill" style={{ width: `${safePct}%` }} />
        {over ? <span className="cap-over" style={{ width: `${overPct}%` }} /> : null}
      </div>

      <div className="cap-scale">
        <span>0h</span>
        <span>容量 {formatHours(capacityMin)}h</span>
        <span>{formatMinutesLabel(plannedMin)}</span>
      </div>

      <p className={`cap-note${over ? ' cap-note--over' : ' cap-note--safe'}`}>
        {over
          ? '今天排得比装得下的多一点。移出一些低优先的块就好，留白不要动。'
          : remainingMin > 0
            ? `装得下，还有 ${formatMinutesLabel(remainingMin)} 余量。留白先留着，临时的事有地方放。`
            : '刚好装满。留白先留着，临时的事有地方放。'}
      </p>

      <div className="cap-actions">
        <button
          className={`btn btn--sm${trimCount > 0 ? ' btn--primary' : ' btn--ghost'}`}
          type="button"
          onClick={onTrim}
          disabled={trimCount === 0}
        >
          {trimCount > 0 ? `移出 ${trimCount} 项` : over ? '暂无可移出' : '无需移出'}
        </button>
        <button className="btn btn--ghost btn--sm" type="button" onClick={onReplan}>
          <Icon name="refresh" size={13} />
          重新规划
        </button>
      </div>
    </section>
  );
}
