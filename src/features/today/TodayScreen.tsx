import { useApp } from '../../store/AppProvider';
import { Icon } from '../../components/Icon';
import { trimCandidates } from '../../lib/capacity';
import { dateLabel } from '../../lib/date';
import { CapacityCard } from './CapacityCard';
import { MitList } from './MitList';
import { NowCard } from './NowCard';
import { Timeline } from './Timeline';
import './today.css';

function greetingFor(hour: number): string {
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export default function TodayScreen() {
  const {
    state,
    now,
    nowMin,
    plan,
    mits,
    collectTasks,
    capacity,
    currentBlock,
    nextBlock,
    focusBlock,
    focusTask,
    go,
    openSettings,
    trimOverload,
    startFocus,
    toggleTaskDone,
  } = useApp();

  const trimCount = trimCandidates(plan.blocks, plan.capacityMin).length;
  const pendingInboxCount = collectTasks.filter((task) => task.status !== 'done').length;
  const activeBlock =
    currentBlock ??
    plan.blocks.find(
      (block) => block.startMin <= nowMin && block.endMin > nowMin,
    ) ??
    null;

  return (
    <div className="screen today">
      <header className="today-top">
        <div className="today-topline">
          <span className="today-date">{dateLabel(now)}</span>
          <div className="today-topline-side">
            <span className="pill pill--accent today-streak">
              <Icon name="spark" size={11} />
              连续 {state.streak} 天
            </span>
            <button
              className="icon-btn today-settings"
              type="button"
              aria-label="打开设置"
              onClick={openSettings}
            >
              <Icon name="settings" size={16} />
            </button>
          </div>
        </div>
        <h1 className="today-greeting">
          {greetingFor(now.getHours())}，{state.settings.name}
        </h1>
        <p className="today-sub">今天想留下点什么？</p>
      </header>

      <CapacityCard
        capacity={capacity}
        bufferRatio={plan.bufferRatio}
        blocks={plan.blocks}
        trimCount={trimCount}
        onTrim={trimOverload}
        onReplan={() => go('plan')}
      />

      <MitList
        tasks={mits.slice(0, 3)}
        currentTaskId={currentBlock?.taskId ?? null}
        onToggle={toggleTaskDone}
        onPlan={() => go('plan')}
      />

      {plan.blocks.length > 0 ? (
        <NowCard
          focusActive={Boolean(state.focus)}
          focusTitle={focusTask?.title ?? focusBlock?.title ?? null}
          focusCategory={focusTask?.category ?? null}
          currentBlock={activeBlock}
          nextBlock={nextBlock}
          nowMin={nowMin}
          tasks={state.tasks}
          onContinue={() => go('focus')}
          onStart={startFocus}
        />
      ) : null}

      <Timeline
        blocks={plan.blocks}
        tasks={state.tasks}
        dayStartMin={state.settings.dayStartMin}
        dayEndMin={state.settings.dayEndMin}
        nowMin={nowMin}
        currentBlockId={currentBlock?.id ?? null}
        focusBlockId={focusBlock?.id ?? null}
        pendingInboxCount={pendingInboxCount}
        onStartFocus={startFocus}
        onPlan={() => go('plan')}
      />
    </div>
  );
}
