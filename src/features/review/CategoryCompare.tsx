import type { DayRecord } from '../../types';
import { CATEGORY_META, CATEGORY_ORDER } from '../../data/constants';
import { formatMinutesLabel } from '../../lib/format';

interface CategoryCompareProps {
  record: DayRecord;
}

export function CategoryCompare({ record }: CategoryCompareProps) {
  const rows = CATEGORY_ORDER.map((category) => ({
    category,
    meta: CATEGORY_META[category],
    plannedMin: record.categories[category].plannedMin,
    actualMin: record.categories[category].actualMin,
  })).filter((row) => row.plannedMin > 0 || row.actualMin > 0);

  const scale = Math.max(1, ...rows.map((row) => Math.max(row.plannedMin, row.actualMin)));
  const widthFor = (value: number) =>
    value > 0 ? `${Math.max(2, Math.round((value / scale) * 100))}%` : '0%';
  const legendGradient = `linear-gradient(90deg, ${CATEGORY_ORDER.map(
    (category, index) =>
      `${CATEGORY_META[category].color} ${index * 25}% ${(index + 1) * 25}%`,
  ).join(', ')})`;

  return (
    <section className="rv-block" aria-label="计划与实际对比">
      <div className="rv-block__head">
        <h2 className="rv-block__title">计划 VS 实际</h2>
        <span className="rv-block__meta">按类别</span>
      </div>

      {rows.length > 0 ? (
        <div className="rv-cmp">
          {rows.map((row) => (
            <div className="rv-cmp-row" key={row.category}>
              <div className="rv-cmp-top">
                <span className="rv-cmp-label">
                  <span className="rv-cmp-dot" style={{ background: row.meta.color }} />
                  {row.meta.label}
                </span>
                <span className="rv-cmp-num">
                  计划 {formatMinutesLabel(row.plannedMin)} · 实际{' '}
                  {formatMinutesLabel(row.actualMin)}
                </span>
              </div>
              <div
                className="rv-cmp-track"
                role="img"
                aria-label={`${row.meta.label}，计划 ${row.plannedMin} 分钟，实际 ${row.actualMin} 分钟`}
              >
                <span className="rv-cmp-plan" style={{ width: widthFor(row.plannedMin) }} />
                <span
                  className="rv-cmp-actual"
                  style={{ width: widthFor(row.actualMin), background: row.meta.color }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rv-cmp-empty">今天还没有带时长的任务可以对账。</p>
      )}

      <div className="rv-legend">
        <span className="rv-legend__item">
          <span className="rv-legend__plan" />
          计划
        </span>
        <span className="rv-legend__item">
          <span style={{ background: legendGradient }} />
          实际（类别色）
        </span>
      </div>
    </section>
  );
}
