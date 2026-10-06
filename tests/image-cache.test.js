'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadClientFunction } = require('./load.js');

const selectImageCacheEvictions = loadClientFunction('selectImageCacheEvictions');
const isImageCacheEntryFresh = loadClientFunction('isImageCacheEntryFresh');

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const entry = (key, ageDays) => ({ key, savedAt: NOW - ageDays * DAY });

test('selectImageCacheEvictions deletes only expired entries when under the cap', () => {
  const keys = selectImageCacheEvictions([entry('a', 1), entry('b', 8), entry('c', 3)], NOW, 7 * DAY, 10);
  assert.deepStrictEqual([...keys], ['b']);
});

test('selectImageCacheEvictions drops the oldest live entries beyond the cap', () => {
  const entries = [entry('new', 1), entry('old', 5), entry('mid', 3)];
  assert.deepStrictEqual([...selectImageCacheEvictions(entries, NOW, 7 * DAY, 2)], ['old']);
});

test('selectImageCacheEvictions combines expired and overflow, expired first', () => {
  const entries = [entry('x', 9), entry('a', 1), entry('b', 2), entry('c', 3)];
  assert.deepStrictEqual([...selectImageCacheEvictions(entries, NOW, 7 * DAY, 2)], ['x', 'c']);
});

test('selectImageCacheEvictions keeps everything for an empty or small cache', () => {
  assert.deepStrictEqual([...selectImageCacheEvictions([], NOW, 7 * DAY, 5)], []);
  assert.deepStrictEqual([...selectImageCacheEvictions([entry('a', 1)], NOW, 7 * DAY, 5)], []);
});

test('isImageCacheEntryFresh rejects missing data, null data and stale entries', () => {
  assert.strictEqual(isImageCacheEntryFresh(undefined, NOW, 7 * DAY), false);
  assert.strictEqual(isImageCacheEntryFresh({ savedAt: NOW, data: null }, NOW, 7 * DAY), false);
  assert.strictEqual(isImageCacheEntryFresh({ savedAt: NOW - 8 * DAY, data: {} }, NOW, 7 * DAY), false);
  assert.strictEqual(isImageCacheEntryFresh({ savedAt: NOW - DAY, data: {} }, NOW, 7 * DAY), true);
});
