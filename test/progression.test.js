import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStars, missionProgress } from '../src/core/progression.js';

test('stars reward efficient level completion',() => {
  assert.equal(calculateStars(1,10),1);
  assert.equal(calculateStars(3,10),2);
  assert.equal(calculateStars(5,10),3);
});

test('mission progress supports every campaign goal',() => {
  const values = {score:900,apples:12,bombs:3,crates:4};
  assert.equal(missionProgress('score',values),900);
  assert.equal(missionProgress('apples',values),12);
  assert.equal(missionProgress('bombs',values),3);
  assert.equal(missionProgress('crates',values),4);
});
