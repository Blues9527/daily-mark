import type { FormEvent } from 'react';
import type { Task } from '../../types';
import { CATEGORY_META } from '../../data/constants';
import { formatDuration } from '../../lib/format';
import { Icon } from '../../components/Icon';

const QUICK_IDEAS = ['回一封邮件', '整理报价单', '看一节课程'];

interface PlanStepBrainProps {
  tasks: Task[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onQuickAdd: (title: string) => void;
  onNext: () => void;
}

export function PlanStepBrain({
  tasks,
  draft,
  onDraftChange,
  onAdd,
  onQuickAdd,
  onNext,
}: PlanStepBrainProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAdd();
  }

  return (
    <>
      <div className="plan-body">
        <h1 className="plan-title">先把脑子里的东西倒出来。</h1>
        <p className="plan-sub">
          不排序，不判断。想到什么写什么，时长可以之后再改。这里不会评判你。
        </p>

        <form className="plan-quick" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="plan-dump-input">
            快速记录一件事
          </label>
          <input
            id="plan-dump-input"
            className="plan-quick-input"
            type="text"
            value={draft}
            placeholder="现在最占脑子的一件事是…"
            autoComplete="off"
            onChange={(event) => onDraftChange(event.target.value)}
          />
          <button
            className="plan-quick-btn"
            type="submit"
            aria-label="添加这件事"
            disabled={draft.trim().length === 0}
          >
            <Icon name="plus" size={16} />
          </button>
        </form>

        <div className="chip-row plan-chips" role="group" aria-label="快捷记录">
          {QUICK_IDEAS.map((idea) => (
            <button
              key={idea}
              className="chip"
              type="button"
              onClick={() => onQuickAdd(idea)}
            >
              {idea}
            </button>
          ))}
        </div>

        <div className="section-label">
          候选
          <span className="section-label__meta">{tasks.length} 件</span>
        </div>

        {tasks.length > 0 ? (
          <ul className="plan-dump-list">
            {tasks.map((task) => {
              const meta = CATEGORY_META[task.category];
              return (
                <li key={task.id} className="plan-dump-row">
                  <span
                    className="plan-dump-dot"
                    style={{ background: meta.color }}
                    aria-hidden="true"
                  />
                  <span className="plan-dump-title">{task.title}</span>
                  {task.status === 'moved' ? <span className="pill">顺延</span> : null}
                  <span className="plan-dump-min">
                    {formatDuration(task.estimateMin)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty plan-empty">
            <p className="empty__title">还没有候选</p>
            <p className="empty__text">
              先写下一件占脑子的事，哪怕只是一句话。写下来，才有得挑。
            </p>
          </div>
        )}
      </div>

      <footer className="plan-cta">
        <button
          className="btn btn--primary btn--block"
          type="button"
          onClick={onNext}
          disabled={tasks.length === 0}
        >
          下一步 · 挑出三件事
          <Icon name="arrowRight" size={16} />
        </button>
        <p className="plan-tip">
          {tasks.length === 0
            ? '至少写下一件事，再开始挑三件。'
            : '不用清空所有事，先处理今天真正要在意的。'}
        </p>
      </footer>
    </>
  );
}
