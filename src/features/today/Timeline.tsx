import { useMemo } from 'react';
import type { Block, Task } from '../../types';
import { CATEGORY_META } from '../../data/constants';
import { formatDuration, minutesToTime } from '../../lib/format';
import { Icon } from '../../components/Icon';

const PX_PER_MIN = 1.2;
const MIN_BLOCK_HEIGHT = 28;
const TOP_PAD = 10;
const COMPACT_HEIGHT = 40;

interface TimelineProps {
  blocks: Block[];
  tasks: Task[];
  dayStartMin: number;
  dayEndMin: number;
  nowMin: number;
  currentBlockId: string | null;
  focusBlockId: string | null;
  pendingInboxCount: number;
  onStartFocus: (blockId: string) => void;
  onPlan: () => void;
}

export function Timeline({
  blocks,
  tasks,
  dayStartMin,
  dayEndMin,
  nowMin,
  currentBlockId,
  focusBlockId,
  pendingInboxCount,
  onStartFocus,
  onPlan,
}: TimelineProps) {
  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const ordered = useMemo(
    () => [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin),
    [blocks],
  );

  const totalMin = Math.max(60, dayEndMin - dayStartMin);
  const height = totalMin * PX_PER_MIN + TOP_PAD * 2;
  const showNow = nowMin >= dayStartMin && nowMin <= dayEndMin;

  const hours: number[] = [];
  for (let minute = Math.ceil(dayStartMin / 60) * 60; minute <= dayEndMin; minute += 60) {
    hours.push(minute);
  }

  return (
    <section className="today-section">
      <div className="section-label">
        时间轴
        <span className="section-label__meta">
          {minutesToTime(dayStartMin)} – {minutesToTime(dayEndMin)}
        </span>
      </div>

      {ordered.length === 0 ? (
        <div className="empty today-empty">
          <p className="empty__title">今天还没有时间块</p>
          <p className="empty__text">
            {pendingInboxCount > 0
              ? `收集箱里还有 ${pendingInboxCount} 件待办。挑三件要紧的，先把今天排出来。`
              : '想到什么先记下来，再回来安排也不迟。'}
          </p>
          <button className="btn btn--primary" type="button" onClick={onPlan}>
            开始今日规划
          </button>
        </div>
      ) : (
        <>
          <div className="today-tl" style={{ height: `${height}px` }}>
            {hours.map((minute) => {
              const top = TOP_PAD + (minute - dayStartMin) * PX_PER_MIN;
              return (
                <div
                  key={`hour-${minute}`}
                  className="today-tl__hour"
                  style={{ top: `${top}px` }}
                >
                  <span className="today-tl__hour-label" aria-hidden="true">
                    {minutesToTime(minute)}
                  </span>
                </div>
              );
            })}

            {ordered.map((block) => {
              const start = Math.max(block.startMin, dayStartMin);
              const end = Math.min(block.endMin, dayEndMin);
              if (end <= start) return null;
              const task = block.taskId ? taskMap.get(block.taskId) : undefined;
              const category = task?.category ?? null;
              const done = task?.status === 'done' || block.completion === 'done';
              const isCurrent =
                currentBlockId === block.id ||
                (block.startMin <= nowMin && nowMin < block.endMin);
              const isFocusing = focusBlockId === block.id;
              const top = TOP_PAD + (start - dayStartMin) * PX_PER_MIN;
              const blockHeight = Math.max(MIN_BLOCK_HEIGHT, (end - start) * PX_PER_MIN);
              const compact = blockHeight < COMPACT_HEIGHT;
              const title = task?.title ?? block.title;

              const metaParts = [
                `${minutesToTime(block.startMin)}–${minutesToTime(block.endMin)}`,
                formatDuration(block.endMin - block.startMin),
              ];
              if (block.kind === 'task' && category) {
                metaParts.push(CATEGORY_META[category].label);
              } else if (block.kind === 'break') {
                metaParts.push('不排事');
              } else if (block.kind === 'buffer') {
                metaParts.push('缓冲');
              } else if (block.kind === 'ritual') {
                metaParts.push('仪式');
              }

              const className = [
                'today-tl__block',
                `today-tl__block--${block.kind}`,
                category ? `today-tl__block--${category}` : '',
                compact ? 'is-compact' : '',
                isCurrent ? 'is-current' : '',
                isFocusing ? 'is-focusing' : '',
                done ? 'is-done' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const content = (
                <>
                  <span className="today-tl__head">
                    <span className="today-tl__title">{title}</span>
                    {block.optional ? <span className="today-tl__tag">可选</span> : null}
                    {isFocusing ? (
                      <span className="today-tl__tag today-tl__tag--live">专注</span>
                    ) : isCurrent ? (
                      <span className="today-tl__tag today-tl__tag--live">现在</span>
                    ) : null}
                  </span>
                  <span className="today-tl__meta">{metaParts.join(' · ')}</span>
                </>
              );

              if (block.kind === 'task') {
                return (
                  <button
                    key={block.id}
                    className={className}
                    type="button"
                    disabled={done}
                    aria-label={
                      done
                        ? `已完成：${title}`
                        : `开始专注：${title}，${minutesToTime(block.startMin)} 到 ${minutesToTime(block.endMin)}`
                    }
                    title={done ? '这个任务已经完成了' : undefined}
                    style={{ top: `${top}px`, height: `${blockHeight}px` }}
                    onClick={() => onStartFocus(block.id)}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={block.id}
                  className={className}
                  style={{ top: `${top}px`, height: `${blockHeight}px` }}
                >
                  {content}
                </div>
              );
            })}

            {showNow ? (
              <div
                className="today-tl__now"
                style={{ top: `${TOP_PAD + (nowMin - dayStartMin) * PX_PER_MIN}px` }}
              >
                <span className="today-tl__now-tag">现在 {minutesToTime(nowMin)}</span>
              </div>
            ) : null}
          </div>

          <button className="today-add-block" type="button" onClick={onPlan}>
            <Icon name="plus" size={14} />
            添加时间块
          </button>
        </>
      )}
    </section>
  );
}
