import type { Block, CapacityStatus } from '../types';

export function blockMinutes(block: Block): number {
  return Math.max(0, block.endMin - block.startMin);
}

export function countsTowardCapacity(block: Block): boolean {
  if (typeof block.countsTowardCapacity === 'boolean') return block.countsTowardCapacity;
  return block.kind === 'task' || block.kind === 'ritual';
}

export function plannedMinutes(blocks: Block[]): number {
  return blocks.filter(countsTowardCapacity).reduce((total, block) => total + blockMinutes(block), 0);
}

export function capacityStatus(blocks: Block[], capacityMin: number): CapacityStatus {
  const plannedMin = plannedMinutes(blocks);
  const safeCapacity = Math.max(1, capacityMin);
  return {
    capacityMin: safeCapacity,
    plannedMin,
    remainingMin: Math.max(0, safeCapacity - plannedMin),
    overMin: Math.max(0, plannedMin - safeCapacity),
    ratio: plannedMin / safeCapacity,
  };
}

export function trimCandidates(blocks: Block[], capacityMin: number): string[] {
  let current = plannedMinutes(blocks);
  if (current <= capacityMin) return [];

  const optional = blocks
    .filter((block) => block.optional && !block.locked)
    .sort((a, b) => b.startMin - a.startMin);

  const removed: string[] = [];
  for (const block of optional) {
    if (current <= capacityMin) break;
    removed.push(block.id);
    current -= blockMinutes(block);
  }
  return removed;
}

export function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

export function blockLabel(block: Block): string {
  if (block.kind === 'buffer') return '留白';
  if (block.kind === 'ritual') return '仪式';
  if (block.kind === 'break') return '休息';
  return '任务';
}
