/**
 * Three-way merges one person row for updateRow(): what the user loaded (baseline),
 * what the sheet holds now (current) and what the user wants to save (mine).
 * Pure — takes plain string arrays so it needs no Apps Script services.
 *
 * A cell the user did not change keeps the sheet's current value (so another user's
 * edit to it survives); a cell only the user changed is written. A cell both changed
 * to different values is a conflict, and so is a row whose first column (the person's
 * name) no longer matches the baseline — it was deleted or shifted by another user.
 *
 * @param {string[]} baseline - Row values as the user loaded them.
 * @param {string[]} current - Row values now in the sheet (already stringified).
 * @param {string[]} mine - Row values the user is saving.
 * @returns {{moved: boolean, conflicts: Array<{colIndex: number, theirs: string, mine: string}>, merged: string[]}}
 *   `merged` is the row to write; it is only meaningful when `moved` is false and `conflicts` is empty.
 */
function mergeRowChanges(baseline, current, mine) {
  const width = Math.max(baseline.length, current.length, mine.length);
  const cell = (row, i) => (i < row.length ? row[i] : '');
  const moved = cell(baseline, 0) !== cell(current, 0);
  const conflicts = [];
  const merged = [];
  for (let i = 0; i < width; i++) {
    const base = cell(baseline, i);
    const theirs = cell(current, i);
    const yours = cell(mine, i);
    if (yours === base) {
      merged.push(theirs);
    } else {
      if (theirs !== base && theirs !== yours) conflicts.push({ colIndex: i, theirs, mine: yours });
      merged.push(yours);
    }
  }
  return { moved, conflicts, merged };
}

/**
 * Whether the row a client addressed by row number still holds the person it meant,
 * judged by the first column (name). Another user deleting or moving a row above
 * shifts row numbers, so a stale number would otherwise hit the wrong person.
 * With no expected name (an older client) the row is accepted.
 *
 * @param {*} cellValue - Raw first-column value currently at that row.
 * @param {string} [expectedName] - Name the client had for that row when it loaded it.
 * @returns {boolean}
 */
function rowMatchesName(cellValue, expectedName) {
  if (expectedName == null) return true;
  return String(cellValue ?? '').trim() === String(expectedName).trim();
}
