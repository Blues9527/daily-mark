const CATEGORY_META = {
  create: { label: '创作', color: '#d95b33', soft: '#f8e2d6' },
  talk: { label: '沟通', color: '#48657d', soft: '#e6edf2' },
  admin: { label: '行政', color: '#8a7e6d', soft: '#f4ede2' },
  life: { label: '生活', color: '#4f6b4f', soft: '#e5ecdf' },
};

const CATEGORY_ORDER = ['create', 'talk', 'admin', 'life'];

const ENERGY_META = {
  high: { label: '高精力', short: '高' },
  mid: { label: '中精力', short: '中' },
  low: { label: '低精力', short: '低' },
};

const ENERGY_ORDER = ['high', 'mid', 'low'];

const BLOCK_CLASS = {
  task: 'task',
  break: 'break',
  buffer: 'buffer',
  ritual: 'ritual',
};

module.exports = {
  CATEGORY_META,
  CATEGORY_ORDER,
  ENERGY_META,
  ENERGY_ORDER,
  BLOCK_CLASS,
};
