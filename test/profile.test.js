import test from 'node:test';
import assert from 'node:assert/strict';
import { completeProfileLevel, createDefaultProfile, normalizeProfile, profileStarTotal } from '../src/core/profile.js';

test('invalid or future profile data is normalized safely',() => {
  const profile = normalizeProfile({version:99,coins:-5,unlockedLevel:999,levels:{1:{stars:8}}},15);
  assert.equal(profile.version,1);
  assert.equal(profile.coins,0);
  assert.equal(profile.unlockedLevel,15);
  assert.equal(profile.levels[1].stars,3);
});

test('first completion unlocks the next level and grants non-repeatable rewards',() => {
  const first = completeProfileLevel(createDefaultProfile(),{levelId:1,stars:2,score:500,maxLevel:15});
  assert.equal(first.profile.unlockedLevel,2);
  assert.equal(first.coinsEarned,75);
  assert.equal(profileStarTotal(first.profile),2);

  const repeat = completeProfileLevel(first.profile,{levelId:1,stars:2,score:450,maxLevel:15});
  assert.equal(repeat.coinsEarned,0);
  assert.equal(repeat.profile.levels[1].bestScore,500);
});

test('improving a result grants only the new star reward',() => {
  const first = completeProfileLevel(createDefaultProfile(),{levelId:1,stars:1,score:300,maxLevel:15});
  const improved = completeProfileLevel(first.profile,{levelId:1,stars:3,score:700,maxLevel:15});
  assert.equal(improved.coinsEarned,50);
  assert.equal(improved.profile.levels[1].stars,3);
});
