import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL_SCHEMA_VERSION, getLevelConfig, validateLevel } from '../src/config/levels.js';

test('campaign contains 15 ordered, valid, versioned levels',() => {
  assert.equal(LEVELS.length,15);
  LEVELS.forEach((level,index) => {
    assert.equal(level.id,index + 1);
    assert.equal(level.schemaVersion,LEVEL_SCHEMA_VERSION);
    assert.deepEqual(validateLevel(level),[],level.title);
  });
});

test('campaign is split into three chapters of five levels',() => {
  assert.deepEqual(LEVELS.map(level => level.chapter),[
    1,1,1,1,1,
    2,2,2,2,2,
    3,3,3,3,3
  ]);
});

test('level lookup is clamped to campaign bounds',() => {
  assert.equal(getLevelConfig(-1).id,1);
  assert.equal(getLevelConfig(100).id,15);
});
