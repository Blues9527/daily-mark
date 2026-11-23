function makeId(prefix) {
  const value = prefix === undefined ? 'id' : prefix;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${value}-${crypto.randomUUID()}`;
  }
  return `${value}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

module.exports = {
  makeId,
};
