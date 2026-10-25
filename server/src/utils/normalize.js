'use strict';

const { QUESTION_TYPES } = require('../config/constants');

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function normalizeChoice(value) {
  return toArray(value)
    .map((item) => String(item).trim())
    .filter(Boolean)
    .sort();
}

function splitFillVariants(value) {
  return String(value ?? '')
    .split(/[|｜]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeFillAnswer(value) {
  return toArray(value).map((item) => normalizeText(item));
}

function isChoiceCorrect(userAnswer, correctAnswer) {
  const user = normalizeChoice(userAnswer);
  const correct = normalizeChoice(correctAnswer);
  return user.length === correct.length && user.every((item, index) => item === correct[index]);
}

function isFillCorrect(userAnswer, correctAnswer) {
  const user = normalizeFillAnswer(userAnswer);
  const correctVariants = toArray(correctAnswer).map(splitFillVariants);
  if (user.length !== correctVariants.length) return false;
  return correctVariants.every((variants, index) => {
    if (variants.length === 0) return false;
    return variants.some((variant) => variant === user[index]);
  });
}

function isAnswerCorrect(type, userAnswer, correctAnswer) {
  switch (type) {
    case QUESTION_TYPES.SINGLE:
    case QUESTION_TYPES.MULTIPLE:
      return isChoiceCorrect(userAnswer, correctAnswer);
    case QUESTION_TYPES.TRUE_FALSE: {
      const user = String(userAnswer ?? '').trim().toLowerCase();
      const correct = String(correctAnswer ?? '').trim().toLowerCase();
      return user !== '' && user === correct;
    }
    case QUESTION_TYPES.FILL:
      return isFillCorrect(userAnswer, correctAnswer);
    case QUESTION_TYPES.SHORT:
      return null;
    default:
      return false;
  }
}

function normalizeBooleanAnswer(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', '1', '对', '正确', 't', 'yes'].includes(text)) return 'true';
  if (['false', '0', '错', '错误', 'f', 'no'].includes(text)) return 'false';
  return null;
}

function isBlankAnswer(answer) {
  if (answer === null || answer === undefined) return true;
  if (Array.isArray(answer)) return answer.every((item) => isBlankAnswer(item));
  return String(answer).trim() === '';
}

module.exports = {
  normalizeText,
  toArray,
  normalizeChoice,
  normalizeFillAnswer,
  splitFillVariants,
  normalizeBooleanAnswer,
  isAnswerCorrect,
  isBlankAnswer,
};
