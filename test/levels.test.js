import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_LEVEL_COUNT, CHAPTERS, LEVELS, LEVEL_SCHEMA_VERSION, campaignEstimatedMinutes, getLevelConfig, validateLevel } from '../src/config/levels.js';

test('campaign contains 100 ordered, valid, versioned levels',() => {
  assert.equal(LEVELS.length,CAMPAIGN_LEVEL_COUNT);
  LEVELS.forEach((level,index) => {
    assert.equal(level.id,index + 1);
    assert.equal(level.schemaVersion,LEVEL_SCHEMA_VERSION);
    assert.deepEqual(validateLevel(level),[],`level ${level.id}: ${level.title}`);
  });
});

test('campaign has ten chapters of ten levels',() => {
  assert.equal(CHAPTERS.length,10);
  for (const chapter of CHAPTERS) {
    assert.equal(LEVELS.filter(level => level.chapter === chapter.id).length,10);
  }
});

test('campaign is estimated to take more than four hours',() => {
  assert.ok(campaignEstimatedMinutes() > 240);
});

test('campaign configurations remain meaningfully varied',() => {
  const signatures = new Set(LEVELS.map(level => [level.type,level.goal,level.moves,level.target,level.maxValue,level.crates,level.crateHp,level.ice,level.iceHp,level.bombEvery].join(':')));
  assert.ok(signatures.size >= 90,`${signatures.size} unique configurations`);
});

test('level lookup is clamped to campaign bounds',() => {
  assert.equal(getLevelConfig(-1).id,1);
  assert.equal(getLevelConfig(999).id,100);
});
