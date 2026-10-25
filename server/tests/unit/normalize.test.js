'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeText,
  normalizeChoice,
  isAnswerCorrect,
  isBlankAnswer,
} = require('../../src/utils/normalize');

test('normalizeText: 去空白、大小写和全角空格', () => {
  assert.equal(normalizeText('  Hello   World '), 'hello world');
  assert.equal(normalizeText('A　B'), 'a b');
  assert.equal(normalizeText(null), '');
});

test('normalizeChoice: 多选排序且去空', () => {
  assert.deepEqual(normalizeChoice(['C', 'A', ' ']), ['A', 'C']);
  assert.deepEqual(normalizeChoice('B'), ['B']);
  assert.deepEqual(normalizeChoice(null), []);
});

test('单选题：标签必须完全一致', () => {
  assert.equal(isAnswerCorrect('single', 'B', 'B'), true);
  assert.equal(isAnswerCorrect('single', 'b', 'B'), true);
  assert.equal(isAnswerCorrect('single', 'A', 'B'), false);
  assert.equal(isAnswerCorrect('single', null, 'B'), false);
});

test('多选题：与顺序无关，漏选/多选算错', () => {
  assert.equal(isAnswerCorrect('multiple', ['A', 'C'], ['C', 'A']), true);
  assert.equal(isAnswerCorrect('multiple', ['A'], ['A', 'C']), false);
  assert.equal(isAnswerCorrect('multiple', ['A', 'B', 'C'], ['A', 'C']), false);
});

test('判断题：对/错与 true/false 都可判分', () => {
  assert.equal(isAnswerCorrect('true_false', 'true', 'true'), true);
  assert.equal(isAnswerCorrect('true_false', 'false', 'true'), false);
  assert.equal(isAnswerCorrect('true_false', '', 'false'), false);
});

test('填空题：支持同义答案和多个空', () => {
  assert.equal(isAnswerCorrect('fill', ['八'], ['8|八']), true);
  assert.equal(isAnswerCorrect('fill', ['8'], ['8|八']), true);
  assert.equal(isAnswerCorrect('fill', ['九'], ['8|八']), false);
  assert.equal(
    isAnswerCorrect('fill', ['hello', 'world'], ['hello|hi', 'world']),
    true,
  );
  assert.equal(
    isAnswerCorrect('fill', ['hello'], ['hello|hi', 'world']),
    false,
  );
});

test('简答题：不自动判分，返回 null', () => {
  assert.equal(isAnswerCorrect('short', '我的答案', '参考答案'), null);
});

test('空答案识别', () => {
  assert.equal(isBlankAnswer(null), true);
  assert.equal(isBlankAnswer(''), true);
  assert.equal(isBlankAnswer(['', ' ']), true);
  assert.equal(isBlankAnswer('x'), false);
});
