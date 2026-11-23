import { useState } from 'react';
import type { Block, Task } from '../../types';
import { CATEGORY_META } from '../../data/constants';
import { capacityStatus, sortBlocks } from '../../lib/capacity';
import { formatDuration, formatMinutesLabel, minutesToTime } from '../../lib/format';
import {
  buildSmartSchedule,
  findFreeSlot,
  type SmartScheduleResult,
} from '../../lib/schedule';
import { useApp } from '../../store/AppProvider';
import { Icon } from '../../components/Icon';

interface PlanStepScheduleProps {
  tasks: Task[];
  onCommit: (blocks: Block[]) => void;
}

interface ScheduleDraft {
  blocks: Block[];
  unscheduledIds: string[];
}

function rotateTasks(tasks: Task[], offset: number): Task[] {
  if (tasks.length <= 1) return tasks;
  const shift = offset % tasks.length;
  return [...tasks.slice(shift), ...tasks.slice(0, shift)];
}

export function PlanStepSchedule({ tasks, onCommit }: PlanStepScheduleProps) {
  const { state, today, plan, toast } = useApp();
  const settings = state.settings;
  const [variant, setVariant] = useState(0);

  function makeDraft(offset: number): ScheduleDraft {
    const result: SmartScheduleResult = buildSmartSchedule({
      date: today,
      tasks: rotateTasks(tasks, offset),
      dayStartMin: settings.dayStartMin,
      dayEndMin: settings.dayEndMin,
      capacityMin: plan.capacityMin,
      bufferRatio: plan.bufferRatio,
      includeReview: true,
    });
    return { blocks: result.blocks, unscheduledIds: result.unscheduledTaskIds };
  }

  const [draft, setDraft] = useState<ScheduleDraft>(() => makeDraft(0));

  const status = capacityStatus(draft.blocks, plan.capacityMin);
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const unscheduled = draft.unscheduledIds
    .map((id) => taskMap.get(id))
    .filter((task): task is Task => Boolean(task));
  const meterWidth = `${Math.min(100, Math.round(status.ratio * 100))}%`;

  function reroll() {
    const next = variant + 1;
    setVariant(next);
    setDraft(makeDraft(next));
    toast('已重新排一版');
  }

  function moveBlock(id: string) {
    const target = draft.blocks.find((block) => block.id === id);
    if (!target) return;
    const duration = Math.max(5, target.endMin - target.startMin);
    const slot = findFreeSlot(
      draft.blocks,
      today,
      duration,
      target.startMin + 15,
      settings.dayEndMin,
      target.id,
    );
    if (!slot) {
      toast('今天没有更晚的空位了');
      return;
    }
    setDraft((previous) => ({
      ...previous,
      blocks: sortBlocks(
        previous.blocks.map((block) =>
          block.id === id
            ? { ...block, startMin: slot.startMin, endMin: slot.endMin }
            : block,
        ),
      ),
    }));
    toast(`已换到 ${minutesToTime(slot.startMin)}`);
  }

  return (
    <>
      <div className="plan-body">
        <h1 className="plan-title">把三件事放进今天。</h1>
        <p className="plan-sub">
          按你的精力曲线，把重要的事放在前面。系统会先留出缓冲，再计算是否排得下。
        </p>

        <section className="card plan-cap" aria-label="今日容量">
          <div className="plan-cap-stats">
            <div className="plan-cap-stat plan-cap-stat--accent">
              <span>已排</span>
              <b>{formatMinutesLabel(status.plannedMin)}</b>
            </div>
            <div className="plan-cap-stat">
              <span>容量</span>
              <b>{formatMinutesLabel(status.capacityMin)}</b>
            </div>
            <div className="plan-cap-stat">
              <span>留白</span>
              <b>{formatMinutesLabel(status.remainingMin)}</b>
            </div>
          </div>
          <div className="meter plan-cap-meter">
            <span
              className="meter__fill meter__fill--safe"
              style={{ width: meterWidth }}
            />
          </div>
          <div className="plan-cap-meta">
            <span>{minutesToTime(settings.dayStartMin)}</span>
            <span>
              {status.remainingMin > 0
                ? `留白 ${formatMinutesLabel(status.remainingMin)} 未动`
                : '容量已经排满'}
            </span>
            <span>{minutesToTime(settings.dayEndMin)}</span>
          </div>
        </section>

        <div className="section-label">
          排程
          <span className="section-label__meta">
            {minutesToTime(settings.dayStartMin)} – {minutesToTime(settings.dayEndMin)}
          </span>
        </div>

        {draft.blocks.length > 0 ? (
          <ul className="plan-sched-list">
            {draft.blocks.map((block) => {
              const task = block.taskId ? taskMap.get(block.taskId) : undefined;
              const meta = task ? CATEGORY_META[task.category] : null;
              const color =
                block.kind === 'task' && meta
                  ? meta.color
                  : block.kind === 'ritual'
                    ? 'var(--green)'
                    : block.kind === 'break'
                      ? 'var(--blue)'
                      : 'var(--faint)';
              const kindLabel =
                block.kind === 'task'
                  ? meta?.label ?? '任务'
                  : block.kind === 'break'
                    ? '不排事'
                    : block.kind === 'buffer'
                      ? '缓冲'
                      : '仪式';
              return (
                <li key={block.id} className="plan-sched-row">
                  <div className="plan-sched-head">
                    <span className="plan-sched-time">
                      {minutesToTime(block.startMin)}–{minutesToTime(block.endMin)}
                    </span>
                    <span
                      className="plan-sched-bar"
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    <span className="plan-sched-title">
                      {task?.title ?? block.title}
                    </span>
                    <span className="plan-sched-min">
                      {formatDuration(block.endMin - block.startMin)}
                    </span>
                  </div>
                  <div className="plan-sched-foot">
                    <span>{kindLabel}</span>
                    {block.kind === 'task' ? (
                      <button
                        className="plan-sched-move"
                        type="button"
                        onClick={() => moveBlock(block.id)}
                      >
                        换时间
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty plan-empty">
            <p className="empty__title">这一版没有排进任何任务</p>
            <p className="empty__text">可以重新排一版，或回到上一步调整挑选。</p>
          </div>
        )}

        <button className="btn btn--ghost plan-reroll" type="button" onClick={reroll}>
          <Icon name="refresh" size={14} />
          重新排一版
        </button>

        {unscheduled.length > 0 ? (
          <div className="plan-warn">
            <b>还有 {unscheduled.length} 件没排进今天</b>
            <p>容量或时间不够，今天先不给它们排时间。可以重新排一版，或回到上一步少挑一件。</p>
            <ul className="plan-warn-list">
              {unscheduled.map((task) => (
                <li key={task.id}>{task.title}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className="plan-cta">
        <button
          className="btn btn--accent btn--block"
          type="button"
          onClick={() => onCommit(draft.blocks)}
        >
          <Icon name="check" size={16} />
          完成今日规划
        </button>
        <p className="plan-tip">之后随时可以在今日页点「重新规划」。</p>
      </footer>
    </>
  );
}
