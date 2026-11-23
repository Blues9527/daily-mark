import type { Category, Energy } from '../types';

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; soft: string }
> = {
  create: { label: '创作', color: 'var(--accent)', soft: 'var(--accent-soft)' },
  talk: { label: '沟通', color: 'var(--blue)', soft: 'var(--blue-soft)' },
  admin: { label: '行政', color: '#8a7e6d', soft: 'var(--paper-2)' },
  life: { label: '生活', color: 'var(--green)', soft: 'var(--green-soft)' },
};

export const CATEGORY_ORDER: Category[] = ['create', 'talk', 'admin', 'life'];

export const ENERGY_META: Record<Energy, { label: string; short: string }> = {
  high: { label: '高精力', short: '高' },
  mid: { label: '中精力', short: '中' },
  low: { label: '低精力', short: '低' },
};

export const ENERGY_ORDER: Energy[] = ['high', 'mid', 'low'];

export const TAB_ITEMS = [
  { screen: 'today', label: '今日' },
  { screen: 'collect', label: '收集' },
  { screen: 'review', label: '复盘' },
  { screen: 'stats', label: '统计' },
] as const;
