/**
 * Appends a new row populated with the given values to the "Database" sheet
 * and returns its 1-based row index. When spreadsheetId is provided, writes to
 * that remote spreadsheet via openSpreadsheetSafely(); otherwise writes locally.
 *
 * @param {string[]} values - Array of cell values, one per column.
 * @param {string|null} [spreadsheetId] - Remote spreadsheet ID, or null/omitted for local.
 * @returns {number} 1-based row index of the newly created row.
 */
function addRowWithData(values, spreadsheetId) {
  const { sheet } = getDatabaseSheet(spreadsheetId);
  const newRowIndex = sheet.getLastRow() + 1;
  const numCols = sheet.getLastColumn();
  const padded = padRowToColumnCount(values, numCols);
  sheet.getRange(newRowIndex, 1, 1, numCols).setValues([padded]);
  return newRowIndex;
}

/**
 * Writes new values for a single data row back to the "Database" sheet.
 * When spreadsheetId is provided, writes to that remote spreadsheet instead.
 *
 * When `baseline` (the row as the user loaded it) is given, the write is checked under a
 * script lock against the sheet's current row via mergeRowChanges(): cells the user did not
 * change keep any newer value from the sheet, and nothing is written if the same cell was
 * changed by someone else or the row was deleted/shifted. Without `baseline` it writes blindly.
 *
 * @param {number} rowIndex - 1-based spreadsheet row number to update.
 * @param {string[]} values - Array of cell values, one per column.
 * @param {string|null} spreadsheetId - Remote spreadsheet ID, or null for local.
 * @param {string[]} [baseline] - Row values as loaded by the client, enabling the conflict check.
 * @returns {{ok: boolean, values: string[], moved?: boolean, conflicts?: Array<{colIndex: number, theirs: string, mine: string}>}}
 *   On success `values` is the row as written; on conflict it is the sheet's current row.
 *   Thrown errors propagate to the client failure handler.
 */
function updateRow(rowIndex, values, spreadsheetId, baseline) {
  const { sheet } = getDatabaseSheet(spreadsheetId);
  if (!baseline) {
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    return { ok: true, values };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(ROW_LOCK_TIMEOUT_MS);
  try {
    const numCols = Math.max(sheet.getLastColumn(), values.length);
    const rowExists = rowIndex <= sheet.getLastRow();
    const current = rowExists ? stringifyRowValues(sheet.getRange(rowIndex, 1, 1, numCols).getValues()[0]) : [];
    const { moved, conflicts, merged } = mergeRowChanges(baseline, current, values);
    if (!rowExists || moved || conflicts.length) {
      return { ok: false, values: current, moved: !rowExists || moved, conflicts };
    }
    sheet.getRange(rowIndex, 1, 1, merged.length).setValues([merged]);
    return { ok: true, values: merged };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Moves a row from the "Database" sheet to the "Trash" sheet.
 * If the Trash sheet does not yet exist it is created with the same
 * header rows (rows 1 and 2) as the Database sheet.
 * When spreadsheetId is provided, operates on that remote spreadsheet instead.
 *
 * @param {number} rowIndex - 1-based spreadsheet row number to delete.
 * @param {string|null} spreadsheetId - Remote spreadsheet ID, or null for local.
 * @param {string} [name] - Expected first-column value; the row is skipped if it differs.
 * @returns {{skippedEntries: Array<{rowIndex: number, spreadsheetId: string|null}>}}
 */
function deleteRow(rowIndex, spreadsheetId, name) {
  return deleteRows([{ rowIndex, spreadsheetId, name }]);
}

/**
 * Moves multiple rows to the Trash sheet (soft delete), processing each spreadsheet's rows
 * in descending rowIndex order to avoid row-shift bugs during sequential deletion.
 * A row whose first column no longer matches the entry's `name` (another user deleted or
 * moved rows above it) is skipped rather than deleting the wrong person.
 * @param {Array<{rowIndex: number, spreadsheetId: string|null, name?: string}>} rowEntries
 * @returns {{skippedEntries: Array<{rowIndex: number, spreadsheetId: string|null}>}}
 *   Thrown errors propagate to the client failure handler.
 */
function deleteRows(rowEntries) {
  const groups = groupAndSortBySpreadsheetId(rowEntries);
  const skippedEntries = [];
  for (const [spreadsheetId, entries] of groups) {
    const { ss, sheet: dbSheet } = getDatabaseSheet(spreadsheetId);

    const numCols = dbSheet.getLastColumn();
    const trashSheet = ensureTrashSheetExists(ss, dbSheet, numCols);
    for (const { rowIndex, name } of entries) {
      const rowData = dbSheet.getRange(rowIndex, 1, 1, numCols).getValues()[0];
      if (!rowMatchesName(rowData[0], name)) {
        skippedEntries.push({ rowIndex, spreadsheetId });
        continue;
      }
      const trashLastRow = Math.max(trashSheet.getLastRow(), 2);
      trashSheet.getRange(trashLastRow + 1, 1, 1, numCols).setValues([rowData]);
      dbSheet.deleteRow(rowIndex);
    }
  }
  return { skippedEntries };
}
