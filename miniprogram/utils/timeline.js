const { minutesToTime, formatDuration } = require('./format');

const PX_PER_MIN = 1.7;

function buildTimeline(blocks, dayStartMin, dayEndMin, nowMin) {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  const items = sorted.map((block) => {
    const topRpx = Math.max(0, Math.round((block.startMin - dayStartMin) * PX_PER_MIN));
    const duration = Math.max(0, block.endMin - block.startMin);
    const heightRpx = Math.max(26, Math.round(duration * PX_PER_MIN) - 4);
    const isCurrent =
      block.kind !== 'buffer' && nowMin >= block.startMin && nowMin < block.endMin;
    return {
      ...block,
      topRpx,
      heightRpx,
      startLabel: minutesToTime(block.startMin),
      endLabel: minutesToTime(block.endMin),
      durationLabel: formatDuration(duration),
      timeLabel: `${minutesToTime(block.startMin)} – ${minutesToTime(block.endMin)}`,
      isCurrent,
      isOptional: Boolean(block.optional),
    };
  });

  const hours = [];
  for (let minute = dayStartMin; minute <= dayEndMin; minute += 60) {
    hours.push({
      label: minutesToTime(minute),
      topRpx: Math.round((minute - dayStartMin) * PX_PER_MIN),
    });
  }

  const nowTopRpx =
    nowMin >= dayStartMin && nowMin <= dayEndMin
      ? Math.round((nowMin - dayStartMin) * PX_PER_MIN)
      : null;

  return {
    items,
    hours,
    nowTopRpx,
    nowLabel: minutesToTime(nowMin),
    heightRpx: Math.round((dayEndMin - dayStartMin) * PX_PER_MIN) + 8,
    hourHeightRpx: Math.round(60 * PX_PER_MIN),
  };
}

module.exports = {
  buildTimeline,
  PX_PER_MIN,
};
