import test from 'node:test';
import assert from 'node:assert/strict';
import { areNeighbors, findSimplePath, neighborIndexes, shuffleInPlace } from '../src/core/grid.js';

test('orthogonal neighbors are accepted and diagonals are rejected',() => {
  assert.equal(areNeighbors(0,1,6),true);
  assert.equal(areNeighbors(0,6,6),true);
  assert.equal(areNeighbors(0,7,6),false);
  assert.equal(areNeighbors(5,6,6),false);
});

test('neighbor list respects board edges',() => {
  assert.deepEqual(neighborIndexes(0,8,6),[6,1]);
  assert.deepEqual(neighborIndexes(47,8,6),[41,46]);
});

test('path finder avoids blocked cells',() => {
  const blocked = new Set([1,7]);
  const path = findSimplePath(0,4,{rows:8,cols:6,blocked});
  assert.equal(path.length,4);
  assert.equal(path.some(index => blocked.has(index)),false);
  for (let index=1; index<path.length; index++) {
    assert.equal(areNeighbors(path[index - 1],path[index],6),true);
  }
});

test('shuffle accepts a deterministic random source',() => {
  const values = [1,2,3,4];
  assert.deepEqual(shuffleInPlace(values,() => 0),[2,3,4,1]);
});
