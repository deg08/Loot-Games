import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getLevelConfig } from '../src/config/levels.js';

test('every authored level has a reachable target requiring at least three fruits',() => {
  for (const level of LEVELS) {
    assert.ok(level.target > level.maxValue * 2,level.title);
    assert.ok(level.moves > 0,level.title);
    assert.ok(level.goal > 0,level.title);
  }
});

test('endless levels scale their score goal',() => {
  const first = getLevelConfig(LEVELS.length);
  const second = getLevelConfig(LEVELS.length + 1);
  assert.ok(second.goal > first.goal);
  assert.equal(first.target,18);
});
