'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadServer, plain } = require('./load.js');

const { _classifyDriveFile, driveViewUrl, isTableType } = loadServer(
  ['Config.js', 'DriveHelpers.js', 'SchemaHelpers.js', 'ImageProxy.js'],
  ['_classifyDriveFile', 'driveViewUrl', 'isTableType'],
);

/**
 * Minimal stand-in for a Drive File.
 * @param {string} mimeType
 * @returns {{getMimeType: function(): string}}
 */
const fileOf = (mimeType) => ({ getMimeType: () => mimeType });

describe('_classifyDriveFile', () => {
  test('classifies a PDF with its file view URL', () => {
    assert.deepEqual(plain(_classifyDriveFile(fileOf('application/pdf'), 'ID1')), {
      type: 'pdf',
      viewUrl: 'https://drive.google.com/file/d/ID1/view',
      mimeType: 'application/pdf',
    });
  });
  test('classifies a Drive folder with its folder URL', () => {
    const info = _classifyDriveFile(fileOf('application/vnd.google-apps.folder'), 'ID2');
    assert.equal(info.type, 'folder');
    assert.equal(info.viewUrl, 'https://drive.google.com/drive/folders/ID2');
  });
  test('treats any other MIME type as an image', () => {
    assert.equal(_classifyDriveFile(fileOf('image/png'), 'ID3').type, 'image');
    assert.equal(_classifyDriveFile(fileOf(''), 'ID3').type, 'image');
  });
});

describe('driveViewUrl', () => {
  test('builds file and folder URLs', () => {
    assert.equal(driveViewUrl(false, 'X'), 'https://drive.google.com/file/d/X/view');
    assert.equal(driveViewUrl(true, 'X'), 'https://drive.google.com/drive/folders/X');
  });
});

describe('isTableType', () => {
  test('matches only types ending in -table', () => {
    assert.equal(isTableType({ type: 'service-table' }), true);
    assert.equal(isTableType({ type: 'text' }), false);
    assert.equal(isTableType({ type: 'table-of' }), false);
  });
});
