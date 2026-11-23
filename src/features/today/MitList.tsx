import type { Task } from '../../types';
import { CATEGORY_META, ENERGY_META } from '../../data/constants';
import { formatDuration } from '../../lib/format';
import { Icon } from '../../components/Icon';

interface MitListProps {
  tasks: Task[];
  currentTaskId: string | null;
  onToggle: (id: string) => void;
  onPlan: () => void;
}

export function MitList({ tasks, currentTaskId, onToggle, onPlan }: MitListProps) {
  const doneCount = tasks.filter((task) => task.status === 'done').length;

  return (
    <section className="today-section">
      <div className="section-label">
        今日三件事
        {tasks.length > 0 ? (
          <span className="section-label__meta">
            {doneCount} / {tasks.length} 完成
          </span>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <div className="empty mit-empty">
          <p className="empty__title">还没挑出今天的三件事</p>
          <p className="empty__text">三个就够。把最想推进的放在前面，剩下的交给时间轴。</p>
          <button className="btn btn--ghost" type="button" onClick={onPlan}>
            安排三件事
          </button>
        </div>
      ) : (
        <ul className="mit-list">
          {tasks.map((task) => {
            const done = task.status === 'done';
            const isCurrent = !done && currentTaskId === task.id;
            const meta = CATEGORY_META[task.category];
            return (
              <li
                key={task.id}
                className={`mit${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
              >
                <button
                  className="mit-check"
                  type="button"
                  aria-pressed={done}
                  aria-label={done ? `把「${task.title}」标记为未完成` : `完成「${task.title}」`}
                  onClick={() => onToggle(task.id)}
                >
                  <span className="mit-check-dot">
                    {done ? <Icon name="check" size={12} /> : null}
                  </span>
                </button>
                <div className="mit-body">
                  <p className="mit-title">{task.title}</p>
                  <p className="mit-meta">
                    {meta.label} · {ENERGY_META[task.energy].label}
                    {done
                      ? ` · 实际 ${formatDuration(task.actualMin ?? task.estimateMin)}`
                      : ` · 预估 ${formatDuration(task.estimateMin)}`}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="pill pill--accent mit-live">进行中</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
