'use strict';

function shuffleArray(source, random = Math.random) {
  const result = Array.isArray(source) ? source.slice() : [];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom(source, count, random = Math.random) {
  const list = Array.isArray(source) ? source.slice() : [];
  if (count >= list.length) return shuffleArray(list, random);
  return shuffleArray(list, random).slice(0, Math.max(0, count));
}

function shuffledOrOriginal(source, enabled, random = Math.random) {
  return enabled ? shuffleArray(source, random) : (Array.isArray(source) ? source.slice() : []);
}

module.exports = {
  shuffleArray,
  pickRandom,
  shuffledOrOriginal,
};
