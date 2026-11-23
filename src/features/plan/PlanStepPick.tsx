import type { Task } from '../../types';
import { CATEGORY_META, ENERGY_META } from '../../data/constants';
import { formatDuration } from '../../lib/format';
import { Icon } from '../../components/Icon';

interface PlanStepPickProps {
  tasks: Task[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlanStepPick({
  tasks,
  selectedIds,
  onToggle,
  onNext,
  onBack,
}: PlanStepPickProps) {
  const restCount = tasks.filter((task) => !selectedIds.includes(task.id)).length;

  return (
    <>
      <div className="plan-body">
        <h1 className="plan-title">今天只做三件事。</h1>
        <p className="plan-sub">
          选 3 件「做完今天就算没白过」的事。其余不会消失，会进入「本周稍后」，明天还可以再挑。
        </p>

        {tasks.length > 0 ? (
          <div className="plan-picks" role="group" aria-label="挑出今天要做的三件事">
            {tasks.map((task) => {
              const rank = selectedIds.indexOf(task.id);
              const picked = rank >= 0;
              const meta = CATEGORY_META[task.category];
              return (
                <button
                  key={task.id}
                  className={`plan-pick${picked ? ' plan-pick--on' : ''}`}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => onToggle(task.id)}
                >
                  <span className="plan-pick-box" aria-hidden="true">
                    {picked ? <Icon name="check" size={12} /> : null}
                  </span>
                  <span className="plan-pick-main">
                    <span className="plan-pick-title">{task.title}</span>
                    <span className="plan-pick-meta">
                      <span
                        className="plan-pick-dot"
                        style={{ background: meta.color }}
                        aria-hidden="true"
                      />
                      {meta.label} · {formatDuration(task.estimateMin)} ·{' '}
                      {ENERGY_META[task.energy].label}
                    </span>
                  </span>
                  <span className="plan-pick-rank">
                    {picked ? `第 ${rank + 1} 件` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty plan-empty">
            <p className="empty__title">还没有可挑的事</p>
            <p className="empty__text">回到上一步写一两件，今天才有得选。</p>
            <button className="btn btn--ghost" type="button" onClick={onBack}>
              回去写一件
            </button>
          </div>
        )}

        {tasks.length > 0 ? (
          <div className="plan-later">
            <span>
              {restCount > 0 ? (
                <>
                  其余 <b>{restCount}</b> 件 → 本周稍后
                </>
              ) : (
                '候选都在这了'
              )}
            </span>
            <span>{restCount > 0 ? '不会丢' : `已选 ${selectedIds.length} 件`}</span>
          </div>
        ) : null}
      </div>

      <footer className="plan-cta">
        <button
          className="btn btn--primary btn--block"
          type="button"
          onClick={onNext}
          disabled={selectedIds.length === 0}
        >
          下一步 · 排进时间
          <Icon name="arrowRight" size={16} />
        </button>
        <p className="plan-tip">
          {selectedIds.length === 0
            ? '至少留一件给今天。'
            : '三件之外的事，今天做是加分，不做也不算失败。'}
        </p>
      </footer>
    </>
  );
}
