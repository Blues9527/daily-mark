import { CATEGORY_META } from '../../data/constants';
import { formatMinutesLabel } from '../../lib/format';
import { parseDateKey } from '../../lib/date';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppProvider';
import { Badges } from './Badges';
import { CalendarGrid } from './CalendarGrid';
import { WeeklyChart } from './WeeklyChart';
import './stats.css';

function shortDate(key: string): string {
  const date = parseDateKey(key);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export default function StatsScreen() {
  const { dashboard, todayRecord, state, toast } = useApp();
  const { weekly, calendar } = dashboard;
  const weekDates = new Set(weekly.map((day) => day.date));
  const weekRecords = state.history.filter((record) => weekDates.has(record.date));
  const weekActualMin = weekRecords.reduce((total, record) => total + record.actualMin, 0);
  const weekCreateMin = weekRecords.reduce(
    (total, record) => total + record.categories.create.actualMin,
    0,
  );
  const createShare = weekActualMin > 0 ? Math.min(1, weekCreateMin / weekActualMin) : 0;
  const mostOver = dashboard.mostOverCategory;
  const range =
    weekly.length > 0
      ? `${shortDate(weekly[0].date)} – ${shortDate(weekly[weekly.length - 1].date)}`
      : '—';

  return (
    <div className="screen stats">
      <header className="stats-head">
        <div className="stats-head-row">
          <div className="stats-head-text">
            <p className="eyebrow">RHYTHM</p>
            <h1 className="title-xl stats-title">统计</h1>
          </div>
          <span className="pill pill--accent stats-streak-pill">
            <Icon name="spark" size={11} />
            连续记录 {dashboard.streak} 天
          </span>
        </div>
        <p className="stats-range">最近 7 天 · {range}</p>
      </header>

      <section className="stats-hero" aria-label={`连续记录 ${dashboard.streak} 天`}>
        <div className="stats-hero-main">
          <span className="stats-hero-label">连续记录</span>
          <b className="stats-hero-value">
            {dashboard.streak}
            <small>天</small>
          </b>
        </div>
        <div className="stats-hero-side">
          <b>
            {todayRecord.actualMin > 0
              ? `今天已记下 ${formatMinutesLabel(todayRecord.actualMin)}`
              : '今天还没开始'}
          </b>
          <span>轻量日也算，补记不清零。</span>
        </div>
      </section>

      <WeeklyChart
        days={weekly}
        weekFocusMin={dashboard.weekFocusMin}
        weekDeltaMin={dashboard.weekDeltaMin}
      />

      <section className="stats-tiles" aria-label="关键指标">
        <div className="stats-tile">
          <span>计划兑现</span>
          <b>
            {Math.round(dashboard.fulfillment * 100)}
            <small>%</small>
          </b>
        </div>
        <div className="stats-tile">
          <span>创作占比</span>
          <b>
            {Math.round(createShare * 100)}
            <small>%</small>
          </b>
        </div>
        <div
          className={`stats-tile stats-tile--text${
            mostOver ? '' : ' stats-tile--empty'
          }`}
        >
          <span>最常超时</span>
          <b>
            {mostOver ? (
              <>
                <i
                  className="stats-cat-dot"
                  style={{ background: CATEGORY_META[mostOver].color }}
                  aria-hidden="true"
                />
                {CATEGORY_META[mostOver].label}
              </>
            ) : (
              '暂无'
            )}
          </b>
        </div>
      </section>

      <CalendarGrid days={calendar} />

      <section className="stats-badges-section" aria-label="轻量纪念">
        <p className="section-label stats-badges-label">
          轻量纪念
          <span className="section-label__meta">只记录，不排名</span>
        </p>
        <Badges
          streak={dashboard.streak}
          totalDeepMin={dashboard.totalDeepMin}
          recordedDays={dashboard.recordedDays}
        />
      </section>

      <div className="stats-action">
        <button
          className="btn btn--ghost btn--block stats-weekly-btn"
          type="button"
          onClick={() => toast('周报将在下一版开放')}
        >
          查看本周复盘
          <Icon name="arrowRight" size={15} />
        </button>
        <p className="stats-footnote">只和上周比，不和人比。</p>
      </div>
    </div>
  );
}
