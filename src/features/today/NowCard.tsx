import { useMemo } from 'react';
import type { Block, Category, Task } from '../../types';
import { CATEGORY_META } from '../../data/constants';
import { formatMinutesLabel, minutesToTime } from '../../lib/format';
import { Icon } from '../../components/Icon';

interface NowCardProps {
  focusActive: boolean;
  focusTitle: string | null;
  focusCategory: Category | null;
  currentBlock: Block | null;
  nextBlock: Block | null;
  nowMin: number;
  tasks: Task[];
  onContinue: () => void;
  onStart: (blockId: string) => void;
}

interface BlockView {
  title: string;
  category: Category | null;
  done: boolean;
}

function restCopy(block: Block): string {
  if (block.kind === 'buffer') return '这段时间留着，不排事。临时来的事，就放在这里。';
  if (block.kind === 'ritual') return '仪式时间。慢慢收个尾，不用再塞别的事。';
  return '先歇一会儿，不用急着开始下一件。';
}

export function NowCard({
  focusActive,
  focusTitle,
  focusCategory,
  currentBlock,
  nextBlock,
  nowMin,
  tasks,
  onContinue,
  onStart,
}: NowCardProps) {
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  function viewOf(block: Block | null): BlockView | null {
    if (!block) return null;
    const task = block.taskId ? taskMap.get(block.taskId) : undefined;
    return {
      title: task?.title ?? block.title,
      category: task?.category ?? null,
      done: task?.status === 'done' || block.completion === 'done',
    };
  }

  const currentView = viewOf(currentBlock);
  const nextView = viewOf(nextBlock);

  if (focusActive) {
    return (
      <section className="today-section">
        <div className="section-label">此刻</div>
        <div className="now-card is-focus">
          <p className="now-kicker">专注计时中</p>
          <h2 className="now-title">{focusTitle ?? '专注进行中'}</h2>
          <p className="now-meta">
            {focusCategory ? `${CATEGORY_META[focusCategory].label} · ` : ''}
            先只做这一件
          </p>
          <div className="now-actions">
            <button className="btn btn--accent" type="button" onClick={onContinue}>
              <Icon name="play" size={12} />
              专注中 · 继续
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (currentBlock && currentView) {
    const remaining = Math.max(1, currentBlock.endMin - nowMin);
    const isTask = currentBlock.kind === 'task';
    return (
      <section className="today-section">
        <div className="section-label">
          此刻
          <span className="section-label__meta">
            {minutesToTime(currentBlock.startMin)} – {minutesToTime(currentBlock.endMin)}
          </span>
        </div>
        <div className={`now-card${isTask ? ' is-current' : ''}`}>
          <p className="now-kicker">
            {isTask ? '正在进行' : currentBlock.kind === 'break' ? '休息中' : currentBlock.kind === 'buffer' ? '留白中' : '仪式时间'}
          </p>
          <h2 className="now-title">{currentView.title}</h2>
          <p className="now-meta">
            {formatMinutesLabel(remaining)} 后结束 · {minutesToTime(currentBlock.endMin)} 结束
            {currentView.category ? ` · ${CATEGORY_META[currentView.category].label}` : ''}
          </p>

          {isTask ? (
            <div className="now-actions">
              <button
                className="btn btn--primary"
                type="button"
                disabled={currentView.done}
                onClick={() => onStart(currentBlock.id)}
              >
                <Icon name="play" size={12} />
                {currentView.done ? '这一块已完成' : '开始专注'}
              </button>
              <span className="now-side">余 {formatMinutesLabel(remaining)}</span>
            </div>
          ) : (
            <>
              <p className="now-rest-note">{restCopy(currentBlock)}</p>
              {nextBlock && nextView ? (
                <div className="now-next">
                  <div className="now-next-main">
                    <span className="now-next-label">下一块</span>
                    <span className="now-next-title">{nextView.title}</span>
                  </div>
                  <span className="now-next-time">{minutesToTime(nextBlock.startMin)}</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    );
  }

  if (nextBlock && nextView) {
    const canStart = nextBlock.kind === 'task' && !nextView.done;
    return (
      <section className="today-section">
        <div className="section-label">
          接下来
          <span className="section-label__meta">{minutesToTime(nextBlock.startMin)} 开始</span>
        </div>
        <div className="now-card">
          <p className="now-kicker">下一块</p>
          <h2 className="now-title">{nextView.title}</h2>
          <p className="now-meta">
            {formatMinutesLabel(nextBlock.endMin - nextBlock.startMin)} ·{' '}
            {minutesToTime(nextBlock.startMin)} – {minutesToTime(nextBlock.endMin)}
            {nextView.category ? ` · ${CATEGORY_META[nextView.category].label}` : ''}
          </p>
          {nextView.done ? (
            <p className="now-rest-note">这一块已经完成了，不用再等它。</p>
          ) : canStart ? (
            <div className="now-actions">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => onStart(nextBlock.id)}
              >
                <Icon name="play" size={12} />
                现在开始
              </button>
            </div>
          ) : (
            <p className="now-rest-note">到点再开始，现在先留给自己。</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="today-section">
      <div className="section-label">此刻</div>
      <div className="now-card">
        <p className="now-kicker">今天</p>
        <h2 className="now-title">时间块走完了</h2>
        <p className="now-meta">没做完的，留到明天也没关系。</p>
      </div>
    </section>
  );
}
