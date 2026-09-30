'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadServer, plain } = require('./load.js');

const { mergeRowChanges, rowMatchesName } = loadServer(['RowMerge.js'], ['mergeRowChanges', 'rowMatchesName']);

describe('mergeRowChanges', () => {
  test('no changes anywhere keeps the row', () => {
    const r = plain(mergeRowChanges(['A', '1', 'x'], ['A', '1', 'x'], ['A', '1', 'x']));
    assert.deepEqual(r, { moved: false, conflicts: [], merged: ['A', '1', 'x'] });
  });
  test('edits to different cells are merged', () => {
    const r = plain(mergeRowChanges(['A', '1', 'x'], ['A', '2', 'x'], ['A', '1', 'y']));
    assert.equal(r.conflicts.length, 0);
    assert.deepEqual(r.merged, ['A', '2', 'y']);
  });
  test('the same cell changed to different values is a conflict', () => {
    const r = plain(mergeRowChanges(['A', '1'], ['A', '2'], ['A', '3']));
    assert.deepEqual(r.conflicts, [{ colIndex: 1, theirs: '2', mine: '3' }]);
  });
  test('the same cell changed to the same value is not a conflict', () => {
    const r = plain(mergeRowChanges(['A', '1'], ['A', '2'], ['A', '2']));
    assert.equal(r.conflicts.length, 0);
    assert.deepEqual(r.merged, ['A', '2']);
  });
  test('a different name in the first column means the row moved', () => {
    assert.equal(mergeRowChanges(['A', '1'], ['B', '1'], ['A', '2']).moved, true);
  });
  test('editing the name itself is not a move', () => {
    const r = plain(mergeRowChanges(['A', '1'], ['A', '1'], ['A2', '1']));
    assert.equal(r.moved, false);
    assert.deepEqual(r.merged, ['A2', '1']);
  });
  test('rows of different lengths are padded with empty strings', () => {
    const r = plain(mergeRowChanges(['A'], ['A', 'new'], ['A', '']));
    assert.deepEqual(r.merged, ['A', 'new']);
    assert.equal(r.conflicts.length, 0);
  });
});

describe('rowMatchesName', () => {
  test('matches ignoring surrounding whitespace', () => {
    assert.equal(rowMatchesName(' ШЕВЧЕНКО Тарас ', 'ШЕВЧЕНКО Тарас'), true);
  });
  test('rejects a different person at that row', () => {
    assert.equal(rowMatchesName('ІВАНЕНКО Іван', 'ШЕВЧЕНКО Тарас'), false);
  });
  test('an empty cell does not match a name (row deleted or beyond the data)', () => {
    assert.equal(rowMatchesName('', 'ШЕВЧЕНКО Тарас'), false);
    assert.equal(rowMatchesName(undefined, 'ШЕВЧЕНКО Тарас'), false);
  });
  test('accepts any row when no name was supplied', () => {
    assert.equal(rowMatchesName('ІВАНЕНКО Іван', undefined), true);
  });
});
