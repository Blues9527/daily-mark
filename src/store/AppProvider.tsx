import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppState,
  Block,
  CapacityStatus,
  DayPlan,
  DayRecord,
  DistractionType,
  NewTaskInput,
  Review,
  ReviewInput,
  ScreenId,
  Settings,
  Task,
} from '../types';
import { createEmptyPlan, createSeedState } from '../data/seed';
import { capacityStatus, sortBlocks, trimCandidates } from '../lib/capacity';
import { addDays, dateKey, nowMinutes } from '../lib/date';
import { focusElapsedSeconds } from '../lib/focus';
import { makeId } from '../lib/id';
import {
  computeDayRecord,
  planTaskIds,
  suggestTomorrowCapacity,
  type CapacitySuggestion,
} from '../lib/review';
import {
  findCurrentBlock,
  findNextBlock,
  rescheduleBlock as rescheduleBlockInPlan,
} from '../lib/schedule';
import { computeDashboard, type DashboardStats } from '../lib/stats';
import { clearState, loadState, saveState } from '../lib/storage';

interface AppContextValue {
  state: AppState;
  now: Date;
  nowMin: number;
  today: string;
  screen: ScreenId;
  plan: DayPlan;
  mits: Task[];
  collectTasks: Task[];
  capacity: CapacityStatus;
  currentBlock: Block | null;
  nextBlock: Block | null;
  focusBlock: Block | null;
  focusTask: Task | null;
  todayRecord: DayRecord;
  todayReview: Review | undefined;
  suggestion: CapacitySuggestion | null;
  dashboard: DashboardStats;
  settingsOpen: boolean;
  toastMessage: string;
  go: (screen: ScreenId) => void;
  closePlan: () => void;
  closeFocus: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toast: (message: string) => void;
  addTask: (input: NewTaskInput) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setMits: (ids: string[]) => void;
  commitPlan: (blocks: Block[], mitIds: string[]) => void;
  removeBlock: (id: string) => void;
  rescheduleBlock: (id: string) => void;
  trimOverload: () => number;
  startFocus: (blockId: string) => void;
  toggleFocusPause: () => void;
  captureDistraction: (text: string, type: DistractionType) => void;
  promoteDistraction: (id: string) => void;
  completeFocus: (completion: 'done' | 'partial', actualMin?: number) => void;
  saveReview: (input: ReviewInput) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

function makeDemoNow(): Date {
  const value = new Date();
  value.setHours(10, 12, 0, 0);
  return value;
}

function withTodayPlan(state: AppState, today: string): AppState {
  if (state.plans[today]) return state;
  const capacityMin = state.tomorrowCapacityMin ?? state.settings.capacityMin;
  return {
    ...state,
    plans: {
      ...state.plans,
      [today]: createEmptyPlan(today, capacityMin, state.settings.bufferRatio),
    },
    focus: null,
    tomorrowCapacityMin: null,
  };
}

function limitedMits(ids: string[]): string[] {
  return [...new Set(ids)].slice(0, 3);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const demo = isDemoMode();
  const initialNow = demo ? makeDemoNow() : new Date();
  const [now, setNow] = useState<Date>(initialNow);
  const [screen, setScreen] = useState<ScreenId>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [state, setState] = useState<AppState>(() => {
    const stored = loadState();
    const today = dateKey(initialNow);
    if (stored) return withTodayPlan(stored, today);
    return createSeedState(today);
  });
  const toastTimer = useRef<number | null>(null);
  const planReturnScreen = useRef<ScreenId>('today');

  const today = dateKey(now);
  const nowMin = nowMinutes(now);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (demo) return;
    const timer = window.setInterval(() => {
      const next = new Date();
      setNow(next);
      const nextKey = dateKey(next);
      setState((previous) =>
        previous.plans[nextKey] ? previous : withTodayPlan(previous, nextKey),
      );
    }, 30000);
    return () => window.clearInterval(timer);
  }, [demo]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function toast(message: string) {
    setToastMessage(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(''), 2300);
  }

  const plan = state.plans[today] ?? createEmptyPlan(today, state.settings.capacityMin, state.settings.bufferRatio);
  const taskMap = useMemo(() => new Map(state.tasks.map((task) => [task.id, task])), [state.tasks]);
  const mits = plan.mitTaskIds
    .map((id) => taskMap.get(id))
    .filter((task): task is Task => Boolean(task));
  const planIds = new Set(planTaskIds(plan));
  const collectTasks = state.tasks.filter((task) => !planIds.has(task.id));
  const capacity = capacityStatus(plan.blocks, plan.capacityMin);
  const currentBlock = findCurrentBlock(plan.blocks, nowMin, today);
  const nextBlock = findNextBlock(plan.blocks, nowMin, today);
  const focusBlock = state.focus
    ? plan.blocks.find((block) => block.id === state.focus?.blockId) ?? null
    : null;
  const focusTask = focusBlock?.taskId ? taskMap.get(focusBlock.taskId) ?? null : null;
  const todayRecord = computeDayRecord(plan, state.tasks);
  const todayReview = state.reviews[today];
  const suggestion = suggestTomorrowCapacity(state.history, plan.capacityMin);
  const dashboard = computeDashboard(state, plan, state.tasks, today);

  function go(nextScreen: ScreenId) {
    if (nextScreen === 'focus' && !state.focus) return;
    if (nextScreen === 'plan' && screen !== 'plan') {
      planReturnScreen.current = screen === 'focus' ? 'today' : screen;
    }
    setScreen(nextScreen);
    setSettingsOpen(false);
  }

  function closePlan() {
    setScreen(planReturnScreen.current === 'plan' ? 'today' : planReturnScreen.current);
  }

  function closeFocus() {
    setScreen('today');
  }

  function addTask(input: NewTaskInput): string {
    const task: Task = {
      id: makeId('task'),
      title: input.title.trim(),
      estimateMin: Math.max(5, input.estimateMin ?? state.settings.defaultEstimateMin),
      category: input.category ?? 'create',
      energy: input.energy ?? 'mid',
      status: 'inbox',
      createdAt: new Date().toISOString(),
    };
    setState((previous) => ({ ...previous, tasks: [task, ...previous.tasks] }));
    toast('已放入收集箱');
    return task.id;
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...patch,
              title: patch.title !== undefined ? patch.title.trim() || task.title : task.title,
            }
          : task,
      ),
    }));
  }

  function deleteTask(id: string) {
    setState((previous) => {
      const plans = Object.fromEntries(
        Object.entries(previous.plans).map(([date, currentPlan]) => [
          date,
          {
            ...currentPlan,
            mitTaskIds: currentPlan.mitTaskIds.filter((taskId) => taskId !== id),
            blocks: currentPlan.blocks.filter((block) => block.taskId !== id),
          },
        ]),
      );
      const focus =
        previous.focus &&
        previous.plans[today]?.blocks.find((block) => block.id === previous.focus?.blockId)?.taskId === id
          ? null
          : previous.focus;
      return {
        ...previous,
        plans,
        tasks: previous.tasks.filter((task) => task.id !== id),
        focus,
      };
    });
    toast('已删除');
  }

  function toggleTaskDone(id: string) {
    setState((previous) => {
      const task = previous.tasks.find((current) => current.id === id);
      if (!task) return previous;
      const nowIso = new Date().toISOString();
      const willBeDone = task.status !== 'done';
      const currentPlan = previous.plans[today];
      const inPlan = Boolean(
        currentPlan &&
          (currentPlan.mitTaskIds.includes(id) ||
            currentPlan.blocks.some((block) => block.taskId === id)),
      );
      const tasks = previous.tasks.map((current) =>
        current.id === id
          ? {
              ...current,
              status: willBeDone ? ('done' as const) : inPlan ? ('planned' as const) : ('inbox' as const),
              actualMin: willBeDone ? current.actualMin ?? current.estimateMin : undefined,
              completedAt: willBeDone ? nowIso : undefined,
            }
          : current,
      );
      const plans = Object.fromEntries(
        Object.entries(previous.plans).map(([date, currentPlan]) => [
          date,
          {
            ...currentPlan,
            blocks: currentPlan.blocks.map((block) =>
              block.taskId === id
                ? {
                    ...block,
                    completion: willBeDone ? ('done' as const) : undefined,
                    actualMin: willBeDone ? block.actualMin ?? block.endMin - block.startMin : undefined,
                  }
                : block,
            ),
          },
        ]),
      );
      if (willBeDone) toast('已完成 · 晚上会出现在复盘里');
      return { ...previous, tasks, plans };
    });
  }

  function setMits(ids: string[]) {
    const nextIds = limitedMits(ids);
    setState((previous) => {
      const currentPlan = previous.plans[today] ?? createEmptyPlan(today, previous.settings.capacityMin, previous.settings.bufferRatio);
      return {
        ...previous,
        plans: { ...previous.plans, [today]: { ...currentPlan, mitTaskIds: nextIds } },
        tasks: previous.tasks.map((task) =>
          nextIds.includes(task.id) && task.status === 'inbox' ? { ...task, status: 'planned' } : task,
        ),
      };
    });
  }

  function commitPlan(blocks: Block[], mitIds: string[]) {
    setState((previous) => {
      const currentPlan = previous.plans[today] ?? createEmptyPlan(today, previous.settings.capacityMin, previous.settings.bufferRatio);
      const nextMits = limitedMits(mitIds);
      const referenced = new Set<string>(nextMits);
      blocks.forEach((block) => {
        if (block.taskId) referenced.add(block.taskId);
      });
      const previousIds = new Set(planTaskIds(currentPlan));
      return {
        ...previous,
        tasks: previous.tasks.map((task) => {
          if (referenced.has(task.id) && (task.status === 'inbox' || task.status === 'moved')) {
            return { ...task, status: 'planned' };
          }
          if (!referenced.has(task.id) && previousIds.has(task.id) && task.status === 'planned') {
            return { ...task, status: 'inbox' };
          }
          return task;
        }),
        plans: {
          ...previous.plans,
          [today]: {
            ...currentPlan,
            mitTaskIds: nextMits,
            blocks: sortBlocks(blocks),
          },
        },
        focus: null,
      };
    });
    setScreen('today');
    toast('今日计划已生成');
  }

  function removeBlock(id: string) {
    setState((previous) => {
      const currentPlan = previous.plans[today];
      if (!currentPlan) return previous;
      const block = currentPlan.blocks.find((candidate) => candidate.id === id);
      if (!block) return previous;
      const blocks = currentPlan.blocks.filter((candidate) => candidate.id !== id);
      const stillUsed = block.taskId
        ? blocks.some((candidate) => candidate.taskId === block.taskId)
        : false;
      return {
        ...previous,
        tasks:
          block.taskId && !stillUsed
            ? previous.tasks.map((task) =>
                task.id === block.taskId && (task.status === 'planned' || task.status === 'active')
                  ? { ...task, status: 'inbox' }
                  : task,
              )
            : previous.tasks,
        plans: { ...previous.plans, [today]: { ...currentPlan, blocks } },
        focus: previous.focus?.blockId === id ? null : previous.focus,
      };
    });
    toast('已移出该时间块');
  }

  function rescheduleBlock(id: string) {
    const blocks = rescheduleBlockInPlan(plan.blocks, id, state.settings.dayEndMin);
    if (!blocks) {
      toast('后面没有合适的空位了');
      return;
    }
    setState((previous) => ({
      ...previous,
      plans: { ...previous.plans, [today]: { ...plan, blocks } },
    }));
    toast('已换到下一个空位');
  }

  function trimOverload(): number {
    const ids = trimCandidates(plan.blocks, plan.capacityMin);
    if (!ids.length) {
      toast('没有可自动移出的块，手动调整一下');
      return 0;
    }
    const removed = new Set(ids);
    const removedTaskIds = new Set(
      plan.blocks.filter((block) => removed.has(block.id) && block.taskId).map((block) => block.taskId as string),
    );
    const remainingBlocks = plan.blocks.filter((block) => !removed.has(block.id));
    const stillUsed = new Set(remainingBlocks.map((block) => block.taskId).filter(Boolean));
    const nextStatus = capacityStatus(remainingBlocks, plan.capacityMin);
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.map((task) =>
        removedTaskIds.has(task.id) && !stillUsed.has(task.id) && task.status === 'planned'
          ? { ...task, status: 'inbox' }
          : task,
      ),
      plans: { ...previous.plans, [today]: { ...plan, blocks: remainingBlocks } },
      focus: previous.focus && removed.has(previous.focus.blockId) ? null : previous.focus,
    }));
    toast(
      nextStatus.overMin > 0
        ? `已移出 ${ids.length} 项，仍超出 ${nextStatus.overMin} 分钟`
        : `已移出 ${ids.length} 项，容量回到安全区`,
    );
    return ids.length;
  }

  function startFocus(blockId: string) {
    if (state.focus && state.focus.blockId !== blockId) {
      toast('先结束当前专注，再开始下一块');
      return;
    }
    const block = plan.blocks.find((candidate) => candidate.id === blockId);
    if (!block || (block.kind !== 'task' && block.kind !== 'ritual')) {
      toast('这个块不是可专注的任务');
      return;
    }
    const task = block.taskId ? taskMap.get(block.taskId) : null;
    if (task?.status === 'done') {
      toast('这个任务已经完成了');
      return;
    }
    if (state.focus?.blockId === blockId) {
      setScreen('focus');
      return;
    }
    setState((previous) => ({
      ...previous,
      focus: {
        blockId,
        date: today,
        startedAt: new Date().toISOString(),
        accumulatedSec: 0,
        paused: false,
        pausedAt: null,
      },
      tasks: block.taskId
        ? previous.tasks.map((current) =>
            current.id === block.taskId && current.status !== 'done'
              ? { ...current, status: 'active' }
              : current,
          )
        : previous.tasks,
    }));
    setScreen('focus');
  }

  function toggleFocusPause() {
    const session = state.focus;
    if (!session) return;
    const moment = new Date();
    if (session.paused) {
      setState((previous) => ({
        ...previous,
        focus: previous.focus
          ? {
              ...previous.focus,
              paused: false,
              pausedAt: null,
              startedAt: moment.toISOString(),
            }
          : null,
      }));
    } else {
      const extra = session.startedAt
        ? (moment.getTime() - new Date(session.startedAt).getTime()) / 1000
        : 0;
      setState((previous) => ({
        ...previous,
        focus: previous.focus
          ? {
              ...previous.focus,
              accumulatedSec: previous.focus.accumulatedSec + extra,
              startedAt: null,
              paused: true,
              pausedAt: moment.toISOString(),
            }
          : null,
      }));
    }
  }

  function captureDistraction(text: string, type: DistractionType) {
    const value = text.trim();
    if (!value) return;
    setState((previous) => ({
      ...previous,
      distractions: [
        {
          id: makeId('distraction'),
          text: value,
          type,
          createdAt: new Date().toISOString(),
          blockId: previous.focus?.blockId,
        },
        ...previous.distractions,
      ],
    }));
    toast('已放在稍后处理，继续这一块');
  }

  function promoteDistraction(id: string) {
    const distraction = state.distractions.find((item) => item.id === id);
    if (!distraction) return;
    addTask({ title: distraction.text, estimateMin: 30, category: 'create', energy: 'mid' });
    setState((previous) => ({
      ...previous,
      distractions: previous.distractions.map((item) =>
        item.id === id ? { ...item, handled: true } : item,
      ),
    }));
  }

  function completeFocus(completion: 'done' | 'partial', actualMin?: number) {
    const session = state.focus;
    if (!session) return;
    const block = plan.blocks.find((candidate) => candidate.id === session.blockId);
    if (!block) {
      setState((previous) => ({ ...previous, focus: null }));
      setScreen('today');
      return;
    }
    const elapsed = focusElapsedSeconds(session, new Date());
    const actual = Math.max(1, actualMin ?? Math.round(elapsed / 60));
    const done = completion === 'done';
    setState((previous) => ({
      ...previous,
      focus: null,
      plans: {
        ...previous.plans,
        [today]: {
          ...plan,
          blocks: plan.blocks.map((candidate) =>
            candidate.id === block.id
              ? { ...candidate, completion, actualMin: actual }
              : candidate,
          ),
        },
      },
      tasks: block.taskId
        ? previous.tasks.map((task) =>
            task.id === block.taskId
              ? {
                  ...task,
                  status: done ? ('done' as const) : ('partial' as const),
                  actualMin: (task.actualMin ?? 0) + actual,
                  completedAt: done ? new Date().toISOString() : task.completedAt,
                }
              : task,
          )
        : previous.tasks,
    }));
    setScreen('today');
    toast(done ? `本段已完成 · 记账 ${actual} 分钟` : `已记录部分完成 · ${actual} 分钟`);
  }

  function saveReview(input: ReviewInput) {
    const record = computeDayRecord(plan, state.tasks);
    setState((previous) => {
      const history = [
        ...previous.history.filter((item) => item.date !== today),
        record,
      ].sort((a, b) => a.date.localeCompare(b.date));
      const streak =
        previous.lastRecordedDate === today
          ? previous.streak
          : previous.lastRecordedDate === addDays(today, -1)
            ? previous.streak + 1
            : 1;
      return {
        ...previous,
        history,
        reviews: {
          ...previous.reviews,
          [today]: {
            date: today,
            reasons: input.reasons,
            note: input.note.trim(),
            tomorrowCapacityMin: input.tomorrowCapacityMin,
            acceptedSuggestion: input.acceptedSuggestion,
            completedAt: new Date().toISOString(),
          },
        },
        streak,
        lastRecordedDate: today,
        tomorrowCapacityMin: input.acceptedSuggestion ? input.tomorrowCapacityMin : previous.tomorrowCapacityMin,
      };
    });
    setScreen('stats');
    toast('已收下今天 · 明天会更准一点');
  }

  function updateSettings(patch: Partial<Settings>) {
    setState((previous) => {
      const settings: Settings = {
        ...previous.settings,
        ...patch,
        capacityMin: Math.max(60, Math.min(720, patch.capacityMin ?? previous.settings.capacityMin)),
        bufferRatio: Math.max(0, Math.min(0.5, patch.bufferRatio ?? previous.settings.bufferRatio)),
        dayStartMin: Math.max(0, Math.min(1380, patch.dayStartMin ?? previous.settings.dayStartMin)),
        dayEndMin: Math.max(0, Math.min(1439, patch.dayEndMin ?? previous.settings.dayEndMin)),
        defaultEstimateMin: Math.max(5, Math.min(240, patch.defaultEstimateMin ?? previous.settings.defaultEstimateMin)),
      };
      return {
        ...previous,
        settings,
        plans: {
          ...previous.plans,
          [today]: {
            ...plan,
            capacityMin: settings.capacityMin,
            bufferRatio: settings.bufferRatio,
          },
        },
      };
    });
    toast('设置已保存');
  }

  function resetDemo() {
    clearState();
    const fresh = createSeedState(today);
    setState(fresh);
    setScreen('today');
    setSettingsOpen(false);
    toast('演示数据已重置');
  }

  const value: AppContextValue = {
    state,
    now,
    nowMin,
    today,
    screen,
    plan,
    mits,
    collectTasks,
    capacity,
    currentBlock,
    nextBlock,
    focusBlock,
    focusTask,
    todayRecord,
    todayReview,
    suggestion,
    dashboard,
    settingsOpen,
    toastMessage,
    go,
    closePlan,
    closeFocus,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    toast,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskDone,
    setMits,
    commitPlan,
    removeBlock,
    rescheduleBlock,
    trimOverload,
    startFocus,
    toggleFocusPause,
    captureDistraction,
    promoteDistraction,
    completeFocus,
    saveReview,
    updateSettings,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
