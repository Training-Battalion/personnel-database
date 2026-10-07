'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadServer, plain } = require('./load.js');

const { _splitTableCell } = loadServer(['Config.js', 'Utils.js', 'ExportXlsx.js'], ['_splitTableCell']);

describe('_splitTableCell', () => {
  test('splits a single row into one value per sub-column', () => {
    assert.deepEqual(plain(_splitTableCell('A | B | C', 3)), ['A', 'B', 'C']);
  });

  test('joins multiple rows per sub-column with newlines', () => {
    assert.deepEqual(plain(_splitTableCell('A | 1\nB | 2', 2)), ['A\nB', '1\n2']);
  });

  test('pads missing fields and drops extras', () => {
    assert.deepEqual(plain(_splitTableCell('A', 2)), ['A', '']);
    assert.deepEqual(plain(_splitTableCell('A | B | C', 2)), ['A', 'B']);
  });

  test('empty cell gives empty strings', () => {
    assert.deepEqual(plain(_splitTableCell('', 2)), ['', '']);
  });
});
