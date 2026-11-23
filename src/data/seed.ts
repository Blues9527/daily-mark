import type {
  AppState,
  Block,
  Category,
  DayPlan,
  DayRecord,
  Task,
} from '../types';
import { addDays, dateKey } from '../lib/date';

interface TaskSeed {
  id: string;
  title: string;
  estimateMin: number;
  energy: Task['energy'];
  category: Category;
  status: Task['status'];
  actualMin?: number;
}

const TASKS: TaskSeed[] = [
  {
    id: 't-reply',
    title: '回复客户 A 的修改意见',
    estimateMin: 20,
    energy: 'low',
    category: 'talk',
    status: 'done',
    actualMin: 22,
  },
  {
    id: 't-hero',
    title: '品牌插画 · 主视觉草稿',
    estimateMin: 90,
    energy: 'high',
    category: 'create',
    status: 'planned',
  },
  {
    id: 't-portfolio',
    title: '整理作品集 · 选 6 张',
    estimateMin: 60,
    energy: 'mid',
    category: 'create',
    status: 'planned',
  },
  {
    id: 't-proposal',
    title: '客户 A 提案修改',
    estimateMin: 75,
    energy: 'mid',
    category: 'talk',
    status: 'planned',
  },
  {
    id: 't-hero2',
    title: '品牌插画 · 上色',
    estimateMin: 90,
    energy: 'high',
    category: 'create',
    status: 'planned',
  },
  {
    id: 't-admin',
    title: '回消息 / 开发票',
    estimateMin: 40,
    energy: 'low',
    category: 'admin',
    status: 'planned',
  },
  {
    id: 't-exercise',
    title: '运动 · 拉伸',
    estimateMin: 60,
    energy: 'low',
    category: 'life',
    status: 'planned',
  },
  {
    id: 't-course',
    title: '课程脚本 · 初稿',
    estimateMin: 60,
    energy: 'mid',
    category: 'create',
    status: 'planned',
  },
  {
    id: 't-review',
    title: '今日复盘',
    estimateMin: 30,
    energy: 'low',
    category: 'admin',
    status: 'planned',
  },
  {
    id: 't-inbox-storyboard',
    title: '客户 B · 分镜初稿',
    estimateMin: 90,
    energy: 'high',
    category: 'create',
    status: 'inbox',
  },
  {
    id: 't-inbox-invite',
    title: '回复合作邀约邮件',
    estimateMin: 20,
    energy: 'low',
    category: 'talk',
    status: 'inbox',
  },
  {
    id: 't-inbox-invoice',
    title: '开发票（11 月）',
    estimateMin: 15,
    energy: 'low',
    category: 'admin',
    status: 'inbox',
  },
  {
    id: 't-inbox-behance',
    title: '整理作品集到个人主页',
    estimateMin: 60,
    energy: 'mid',
    category: 'create',
    status: 'inbox',
  },
  {
    id: 't-inbox-tips',
    title: '买新的数位笔尖',
    estimateMin: 10,
    energy: 'low',
    category: 'life',
    status: 'inbox',
  },
  {
    id: 't-inbox-meeting',
    title: '跟客户 C 确认下周三会议',
    estimateMin: 10,
    energy: 'low',
    category: 'talk',
    status: 'inbox',
  },
  {
    id: 't-inbox-storage',
    title: '续费云存储',
    estimateMin: 5,
    energy: 'low',
    category: 'admin',
    status: 'done',
    actualMin: 5,
  },
];

function makeTask(seed: TaskSeed, date: string): Task {
  return {
    id: seed.id,
    title: seed.title,
    estimateMin: seed.estimateMin,
    energy: seed.energy,
    category: seed.category,
    status: seed.status,
    createdAt: new Date(`${date}T08:00:00`).toISOString(),
    actualMin: seed.actualMin,
    completedAt: seed.status === 'done' ? new Date(`${date}T08:45:00`).toISOString() : undefined,
  };
}

function block(
  id: string,
  date: string,
  title: string,
  startMin: number,
  endMin: number,
  kind: Block['kind'],
  options: Partial<Block> = {},
): Block {
  return {
    id,
    date,
    title,
    startMin,
    endMin,
    kind,
    ...options,
  };
}

function buildPlan(date: string): DayPlan {
  const blocks: Block[] = [
    block('b-hero', date, '品牌插画 · 主视觉草稿', 9 * 60, 10 * 60 + 30, 'task', {
      taskId: 't-hero',
      countsTowardCapacity: true,
    }),
    block('b-proposal', date, '客户 A · 提案修改', 10 * 60 + 45, 12 * 60, 'task', {
      taskId: 't-proposal',
      countsTowardCapacity: true,
    }),
    block('b-lunch', date, '午餐 · 散步', 12 * 60, 13 * 60 + 30, 'break', {
      countsTowardCapacity: false,
      locked: true,
    }),
    block('b-hero2', date, '品牌插画 · 上色', 13 * 60 + 30, 15 * 60, 'task', {
      taskId: 't-hero2',
      countsTowardCapacity: true,
    }),
    block('b-admin', date, '回消息 / 开发票', 15 * 60, 15 * 60 + 40, 'task', {
      taskId: 't-admin',
      countsTowardCapacity: true,
      optional: true,
    }),
    block('b-exercise', date, '运动 · 拉伸', 16 * 60, 17 * 60, 'task', {
      taskId: 't-exercise',
      countsTowardCapacity: true,
    }),
    block('b-buffer', date, '留白 · 不排事', 17 * 60, 20 * 60, 'buffer', {
      countsTowardCapacity: false,
      locked: true,
    }),
    block('b-course', date, '课程脚本 · 初稿', 20 * 60, 21 * 60, 'task', {
      taskId: 't-course',
      countsTowardCapacity: true,
      optional: true,
    }),
    block('b-review', date, '今日复盘', 21 * 60, 21 * 60 + 30, 'ritual', {
      taskId: 't-review',
      countsTowardCapacity: true,
    }),
  ];

  return {
    date,
    capacityMin: 360,
    bufferRatio: 0.2,
    mitTaskIds: ['t-reply', 't-hero', 't-portfolio'],
    blocks,
  };
}

function makeRecord(date: string, actualMin: number, index: number): DayRecord {
  const plannedMin = actualMin + 60 + (index % 3) * 15;
  const createActual = Math.round(actualMin * 0.48);
  const talkActual = Math.round(actualMin * 0.3);
  const adminActual = Math.max(10, Math.round(actualMin * 0.1));
  const lifeActual = Math.max(0, actualMin - createActual - talkActual - adminActual);
  const createPlanned = Math.round(plannedMin * 0.58);
  const talkPlanned = Math.round(plannedMin * 0.15);
  const adminPlanned = Math.max(15, Math.round(plannedMin * 0.14));
  const lifePlanned = Math.max(0, plannedMin - createPlanned - talkPlanned - adminPlanned);
  const categories: DayRecord['categories'] = {
    create: { plannedMin: createPlanned, actualMin: createActual },
    talk: { plannedMin: talkPlanned, actualMin: talkActual },
    admin: { plannedMin: adminPlanned, actualMin: adminActual },
    life: { plannedMin: lifePlanned, actualMin: lifeActual },
  };
  return {
    date,
    plannedMin,
    actualMin,
    completedTasks: 3 + (index % 3),
    totalTasks: 6 + (index % 3),
    deepMin: createActual,
    fulfillment: Math.min(1, actualMin / plannedMin),
    categories,
  };
}

export function createSeedState(today: string): AppState {
  const actuals = [180, 210, 160, 150, 200, 170, 190, 140, 180, 160, 210, 190, 170];
  const history = actuals.map((actual, index) =>
    makeRecord(addDays(today, index - actuals.length), actual, index),
  );
  const yesterday = addDays(today, -1);

  return {
    version: 1,
    tasks: TASKS.map((task) => makeTask(task, today)),
    plans: { [today]: buildPlan(today) },
    reviews: {
      [yesterday]: {
        date: yesterday,
        reasons: ['客户临时改需求'],
        note: '把深度创作放在上午，是对的。',
        tomorrowCapacityMin: null,
        acceptedSuggestion: false,
        completedAt: new Date(`${yesterday}T21:30:00`).toISOString(),
      },
    },
    history,
    distractions: [],
    settings: {
      name: '阿川',
      dayStartMin: 9 * 60,
      dayEndMin: 21 * 60 + 30,
      capacityMin: 360,
      bufferRatio: 0.2,
      defaultEstimateMin: 30,
    },
    streak: 12,
    lastRecordedDate: yesterday,
    tomorrowCapacityMin: null,
    focus: null,
    distractionsHandledAt: null,
  };
}

export function createEmptyPlan(date: string, capacityMin: number, bufferRatio: number): DayPlan {
  return {
    date,
    capacityMin,
    bufferRatio,
    mitTaskIds: [],
    blocks: [],
  };
}

export function todayKey(): string {
  return dateKey(new Date());
}
