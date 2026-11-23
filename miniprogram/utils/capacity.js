function blockMinutes(block) {
  return Math.max(0, block.endMin - block.startMin);
}

function countsTowardCapacity(block) {
  if (typeof block.countsTowardCapacity === 'boolean') return block.countsTowardCapacity;
  return block.kind === 'task' || block.kind === 'ritual';
}

function plannedMinutes(blocks) {
  return blocks
    .filter((block) => countsTowardCapacity(block))
    .reduce((total, block) => total + blockMinutes(block), 0);
}

function capacityStatus(blocks, capacityMin) {
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

function trimCandidates(blocks, capacityMin) {
  let current = plannedMinutes(blocks);
  if (current <= capacityMin) return [];

  const optional = blocks
    .filter((block) => block.optional && !block.locked)
    .sort((a, b) => b.startMin - a.startMin);

  const removed = [];
  for (const block of optional) {
    if (current <= capacityMin) break;
    removed.push(block.id);
    current -= blockMinutes(block);
  }
  return removed;
}

function sortBlocks(blocks) {
  return [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

function blockLabel(block) {
  if (block.kind === 'buffer') return '留白';
  if (block.kind === 'ritual') return '仪式';
  if (block.kind === 'break') return '休息';
  return '任务';
}

module.exports = {
  blockMinutes,
  countsTowardCapacity,
  plannedMinutes,
  capacityStatus,
  trimCandidates,
  sortBlocks,
  blockLabel,
};
