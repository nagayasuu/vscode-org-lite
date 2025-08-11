import * as vscode from 'vscode';
import { ORG_TABLE_SEPARATOR } from '../constants';
import * as orgTableUtils from '../utils/orgTableUtils';

// org-lite.tableDeleteColumn
export async function deleteTableColumn() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  if (!orgTableUtils.isTableLine(lineText)) return;
  const { startLine, endLine } = detectTableRange(editor, pos.line);
  const tableLines = getTableLines(editor, startLine, endLine);
  const rows = orgTableUtils.splitTableRows(tableLines);
  // Determine the current cell index
  const cellIdx = orgTableUtils.getCellIndexAtPosition(lineText, pos.character);
  // Remove the column at cellIdx from all rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) continue;
    if (cellIdx < row.length) {
      row.splice(cellIdx, 1);
    }
  }
  // Reformat (handle last column deletion simply)
  const colWidths = orgTableUtils.calcColWidths(rows);
  if (colWidths.length === 0) {
    // If all data rows are empty, delete all lines in the table range
    const allEmpty = rows.every(
      row =>
        row.length === 0 || (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR)
    );
    if (allEmpty) {
      await editor.edit(editBuilder => {
        for (let i = startLine; i <= endLine; i++) {
          editBuilder.delete(editor.document.lineAt(i).rangeIncludingLineBreak);
        }
      });
    }
    return;
  }
  await formatTable(editor, startLine, endLine, rows, colWidths);
  // Move the cursor to the start of the same row, same column (or previous column if at end)
  const newLine = pos.line;
  const newRowText = editor.document.lineAt(newLine).text;
  const newCellIdx = Math.min(
    cellIdx,
    orgTableUtils.splitTableLineToCells(newRowText).length - 1
  );
  const offset = orgTableUtils.getCellOffsetInRow(newRowText, newCellIdx);
  const newPos = new vscode.Position(newLine, offset);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// org-lite.formatOrgTable
export async function formatOrgTable() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  if (!orgTableUtils.isTableLine(lineText)) return;
  const { startLine, endLine } = detectTableRange(editor, pos.line);
  const tableLines = getTableLines(editor, startLine, endLine);
  const rows = orgTableUtils.splitTableRows(tableLines);
  const colWidths = orgTableUtils.calcColWidths(rows);
  await formatTable(editor, startLine, endLine, rows, colWidths);

  // Add an empty row to the next line and move the cursor to the first cell
  const indent = orgTableUtils.getIndent(editor.document.lineAt(endLine).text);
  const emptyRow = orgTableUtils.formatEmptyRow(colWidths, indent);
  const lastLine = editor.document.lineAt(endLine).range.end;
  await editor.edit(editBuilder => {
    editBuilder.insert(lastLine, '\n' + emptyRow);
  });
  // Move the cursor to the first cell of the added row
  const firstCellIdx = emptyRow.indexOf('| ') + 2;
  const newPos = new vscode.Position(endLine + 1, firstCellIdx);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// org-lite.tableMoveColumnLeft
export async function moveTableColumn(direction: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  if (!orgTableUtils.isTableLine(lineText)) return;
  const { startLine, endLine } = detectTableRange(editor, pos.line);
  const tableLines = getTableLines(editor, startLine, endLine);
  const rows = orgTableUtils.splitTableRows(tableLines);
  // Determine the current cell index
  const cellIdx = orgTableUtils.getCellIndexAtPosition(lineText, pos.character);
  // Get the maximum number of columns and pad all rows
  const maxCols = Math.max(
    ...rows
      .filter(r => !(r.length === 1 && r[0] === ORG_TABLE_SEPARATOR))
      .map(r => r.length)
  );
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) continue;
    while (row.length < maxCols) row.push('');
  }
  // Check for left/right edge
  if (direction === -1 && cellIdx <= 0) return;
  if (direction === 1 && cellIdx >= maxCols - 1) return;
  // Swap columns
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) continue;
    const from = cellIdx;
    const to = cellIdx + direction;
    if (to >= 0 && to < row.length) {
      const tmp = row[from];
      row[from] = row[to];
      row[to] = tmp;
    }
  }
  // Reformat
  const colWidths = orgTableUtils.calcColWidths(rows);
  await formatTable(editor, startLine, endLine, rows, colWidths);
  // Move the cursor
  const newLine = pos.line;
  const newRowText = editor.document.lineAt(newLine).text;
  const newCellMatches = [...newRowText.matchAll(/\|/g)];
  const newCellIdx = cellIdx + direction;
  const offset = orgTableUtils.getCellOffsetInRow(newRowText, newCellIdx);
  const newPos = new vscode.Position(newLine, offset);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// org-lite.onTableEnter
export async function onTableEnter() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const tableLine = orgTableUtils.isTableLine(lineText);
  if (!tableLine) return;
  const { startLine, endLine } = detectTableRange(editor, pos.line);
  const isHeader = pos.line === startLine;
  if (isHeader) {
    await insertColumn(editor, startLine, endLine);

    // Move the cursor to the beginning of the new column
    const lineText = editor.document.lineAt(pos.line).text;
    const newPos = new vscode.Position(pos.line, lineText.length - 2);
    editor.selection = new vscode.Selection(newPos, newPos);
  } else {
    // Always reformat the table before moving the cursor
    const tableLines = getTableLines(editor, startLine, endLine);
    const rows = orgTableUtils.splitTableRows(tableLines);
    const colWidths = orgTableUtils.calcColWidths(rows);
    await formatTable(editor, startLine, endLine, rows, colWidths);
    // Move vertically to the cell below, or add a new row if at the last row
    if (pos.line === endLine) {
      // Add a new empty row and move the cursor to the beginning of the same column
      const indent = orgTableUtils.getIndent(lineText);
      const emptyRow = orgTableUtils.formatEmptyRow(colWidths, indent);
      await editor.edit(editBuilder => {
        const lastLine = editor.document.lineAt(endLine).range.end;
        editBuilder.insert(lastLine, '\n' + emptyRow);
      });
      // Calculate the current cell position
      const cellIdx = orgTableUtils.getCellIndexAtPosition(
        lineText,
        pos.character
      );
      // Move the cursor to the beginning of the same cell in the new row (consider indentation)
      const newRowText = emptyRow;
      const offset = orgTableUtils.getCellOffsetInRow(newRowText, cellIdx);
      const newPos = new vscode.Position(pos.line + 1, offset);
      editor.selection = new vscode.Selection(newPos, newPos);
    } else if (pos.line + 1 <= endLine) {
      const nextRowText = editor.document.lineAt(pos.line + 1).text;
      const cellIdx = orgTableUtils.getCellIndexAtPosition(
        lineText,
        pos.character
      );
      const nextCellMatches = [...nextRowText.matchAll(/\|/g)];
      if (cellIdx < nextCellMatches.length - 1) {
        const offset = orgTableUtils.getCellOffsetInRow(nextRowText, cellIdx);
        const newPos = new vscode.Position(pos.line + 1, offset);
        editor.selection = new vscode.Selection(newPos, newPos);
      }
    }
  }
}

// org-lite.tableShiftTabAction
export async function moveToPrevTableCell() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const tableLine = orgTableUtils.isTableLine(lineText);
  if (tableLine) {
    const { startLine, endLine } = detectTableRange(editor, pos.line);
    const tableLines = getTableLines(editor, startLine, endLine);
    const rows = orgTableUtils.splitTableRows(tableLines);
    const colWidths = orgTableUtils.calcColWidths(rows);
    // Always reformat the table before moving the cursor
    await formatTable(editor, startLine, endLine, rows, colWidths);
    const prevCellPos = getPrevCellPosition(editor, pos, startLine, endLine);
    if (prevCellPos) {
      editor.selection = new vscode.Selection(prevCellPos, prevCellPos);
    }
  }
}

// org-lite.tableTabAction
export async function tableTabAction() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  // Use table line detection function
  const tableLine = orgTableUtils.isTableLine(lineText);
  if (tableLine) {
    // Table formatting process
    const { startLine, endLine } = detectTableRange(editor, pos.line);
    const tableLines = getTableLines(editor, startLine, endLine);
    const rows = orgTableUtils.splitTableRows(tableLines);
    const colWidths = orgTableUtils.calcColWidths(rows);

    // If the current line is a separator line, format it as a separator
    if (orgTableUtils.isSeparatorLine(lineText)) {
      await insertSeparatorLine(editor, pos.line, colWidths);
      return;
    }

    // Always reformat the table before moving the cursor
    await formatTable(editor, startLine, endLine, rows, colWidths);

    // Tab key cell navigation
    let nextCellPos = getNextCellPosition(editor, pos, startLine, endLine);

    if (nextCellPos) {
      let nextLine = nextCellPos.line;
      // If the destination is a separator line, move to the first cell of the next line
      if (
        nextLine < editor.document.lineCount &&
        orgTableUtils.isSeparatorLine(editor.document.lineAt(nextLine).text)
      ) {
        // First cell of the next line
        if (nextLine + 1 < editor.document.lineCount) {
          const afterSepLine = editor.document.lineAt(nextLine + 1).text;
          const firstCell = afterSepLine.indexOf('| ');
          if (firstCell !== -1) {
            nextCellPos = new vscode.Position(nextLine + 1, firstCell + 2);
          } else {
            // If there is no cell, move to the beginning of the line
            nextCellPos = new vscode.Position(nextLine + 1, 0);
          }
        }
      }
      editor.selection = new vscode.Selection(nextCellPos, nextCellPos);
      return;
    }

    await insertEmptyRow(editor, endLine, colWidths);
    // Move the cursor precisely to just after the "| " of the newly added empty row (the beginning of the first cell, considering indentation)
    const origLine = editor.document.lineAt(pos.line).text;
    const indent = orgTableUtils.getIndent(origLine);
    const nextLine = orgTableUtils.formatEmptyRow(colWidths, indent);
    let idx = nextLine.indexOf('| ') + 2;
    const newPos = new vscode.Position(pos.line + 1, idx);
    editor.selection = new vscode.Selection(newPos, newPos);
  }
}

// orgTableLineFocus context key management function
export function updateOrgTableLineFocus() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    vscode.commands.executeCommand('setContext', 'orgTableLineFocus', false);
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const isTable = orgTableUtils.isTableLine(lineText);
  let isTableLineFocus = isTable;
  // If the next or previous line is also a table line, set to false
  if (isTable) {
    // Check next line
    if (pos.line + 1 < editor.document.lineCount) {
      const nextLineText = editor.document.lineAt(pos.line + 1).text;
      if (orgTableUtils.isTableLine(nextLineText)) {
        isTableLineFocus = false;
      }
    }
    // Check previous line
    if (pos.line - 1 >= 0) {
      const prevLineText = editor.document.lineAt(pos.line - 1).text;
      if (orgTableUtils.isTableLine(prevLineText)) {
        isTableLineFocus = false;
      }
    }
  }
  vscode.commands.executeCommand(
    'setContext',
    'orgTableLineFocus',
    isTableLineFocus
  );
}

// orgTableCellFocus context key management function
export function updateOrgTableCellFocus() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    vscode.commands.executeCommand('setContext', 'orgTableCellFocus', false);
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const tableLine = orgTableUtils.isTableLine(lineText);
  let focus = false;
  if (tableLine) {
    // Inside table: when the cursor is between the first and last '|'
    const firstBar = lineText.indexOf('|');
    const lastBar = lineText.lastIndexOf('|');
    if (
      firstBar !== -1 &&
      lastBar !== -1 &&
      pos.character > firstBar &&
      pos.character < lastBar
    ) {
      focus = true;
    }
  }
  vscode.commands.executeCommand('setContext', 'orgTableCellFocus', focus);
}

async function insertColumn(
  editor: vscode.TextEditor,
  startLine: number,
  endLine: number
) {
  const tableLines = getTableLines(editor, startLine, endLine);
  const rows = orgTableUtils.splitTableRows(tableLines);
  const newRows = orgTableUtils.addColumnToTableRows(rows);
  const colWidths = orgTableUtils.calcColWidths(newRows);

  const formattedLines = newRows.map((row, idx) => {
    const origLine = editor.document.lineAt(startLine + idx).text;
    const indent = orgTableUtils.getIndent(origLine);

    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) {
      return indent + orgTableUtils.formatSeparatorLine(colWidths);
    }
    return indent + orgTableUtils.formatTableRow(row, colWidths);
  });

  // Reflect the table in the editor
  await editor.edit(editBuilder => {
    for (let i = 0; i < formattedLines.length; i++) {
      editBuilder.replace(
        editor.document.lineAt(startLine + i).range,
        formattedLines[i]
      );
    }
  });
}

function getPrevCellPosition(
  editor: vscode.TextEditor,
  pos: vscode.Position,
  startLine: number,
  endLine: number
): vscode.Position | null {
  const lines: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    lines[i] = editor.document.lineAt(i).text;
  }

  const info = orgTableUtils.getPrevCellPositionInfo(
    lines,
    pos.line,
    pos.character,
    startLine
  );

  if (info) {
    return new vscode.Position(info.line, info.offset);
  }
  return null;
}

function getNextCellPosition(
  editor: vscode.TextEditor,
  pos: vscode.Position,
  startLine: number,
  endLine: number
): vscode.Position | null {
  const lines: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    lines[i] = editor.document.lineAt(i).text;
  }

  const info = orgTableUtils.getNextCellPositionInfo(
    lines,
    pos.line,
    pos.character,
    startLine,
    endLine
  );

  if (info) {
    return new vscode.Position(info.line, info.offset);
  }
  return null;
}

// Function to get the latest column widths of the current table range
function getLatestColWidths(editor: vscode.TextEditor, line: number): number[] {
  let startLine = line,
    endLine = line;
  const doc = editor.document;

  // Search upwards
  while (
    startLine > 0 &&
    orgTableUtils.isTableLine(doc.lineAt(startLine - 1).text)
  ) {
    startLine--;
  }

  // Search downwards
  while (
    endLine < doc.lineCount - 1 &&
    orgTableUtils.isTableLine(doc.lineAt(endLine + 1).text)
  ) {
    endLine++;
  }

  const tableLines: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const t = doc.lineAt(i).text;
    if (!orgTableUtils.isSeparatorLine(t)) tableLines.push(t);
  }
  return orgTableUtils.getColWidthsFromTableLines(tableLines);
}

// Format and insert separator line and empty row
async function insertSeparatorLine(
  editor: vscode.TextEditor,
  line: number,
  colWidths?: number[]
) {
  // Always get the latest column widths
  const latestColWidths = getLatestColWidths(editor, line);
  // Always get indentation using getIndent
  const origLine = editor.document.lineAt(line).text;
  const indent = orgTableUtils.getIndent(origLine);
  const sep = orgTableUtils.formatSeparatorLine(latestColWidths, indent);
  const emptyRow = orgTableUtils.formatEmptyRow(latestColWidths, indent);
  await editor.edit(editBuilder => {
    editBuilder.replace(editor.document.lineAt(line).range, sep);
    // Insert empty row below
    const sepEnd = editor.document.lineAt(line).range.end;
    editBuilder.insert(sepEnd, '\n' + emptyRow);
  });
  // Move cursor to just after "| " of the new empty row
  const newPos = new vscode.Position(line + 1, (indent.length || 0) + 2);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// Format and replace table rows (without adding a new row)
async function formatTable(
  editor: vscode.TextEditor,
  startLine: number,
  endLine: number,
  rows: string[][],
  colWidths: number[]
) {
  // Get the indentation of each line
  const indents: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const line = editor.document.lineAt(i).text;
    const m = line.match(/^([ \t]*)/);
    indents.push(m ? m[1] : '');
  }
  const formatted = rows.map((row, idx) => {
    const indent = indents[idx] || '';
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) {
      return indent + orgTableUtils.formatSeparatorLine(colWidths);
    }
    return indent + orgTableUtils.formatTableRow(row, colWidths);
  });
  await editor.edit(editBuilder => {
    for (let i = startLine; i <= endLine; i++) {
      editBuilder.replace(
        editor.document.lineAt(i).range,
        formatted[i - startLine]
      );
    }
  });
}

// Insert an empty row below the table
async function insertEmptyRow(
  editor: vscode.TextEditor,
  endLine: number,
  colWidths?: number[]
) {
  // Always get the latest column widths
  const latestColWidths = getLatestColWidths(editor, endLine);
  // Always get indentation using getIndent
  const origLine = editor.document.lineAt(endLine).text;
  const indent = orgTableUtils.getIndent(origLine);
  const emptyRow = orgTableUtils.formatEmptyRow(latestColWidths, indent);
  const lastLine = editor.document.lineAt(endLine).range.end;
  await editor.edit(editBuilder => {
    editBuilder.insert(lastLine, '\n' + emptyRow);
  });
}

// Detect table range (startLine, endLine)
function detectTableRange(
  editor: vscode.TextEditor,
  line: number
): { startLine: number; endLine: number } {
  let startLine = line;
  let endLine = line;
  while (
    startLine > 0 &&
    /^\s*\|.*\|\s*$/.test(editor.document.lineAt(startLine - 1).text)
  ) {
    startLine--;
  }
  while (
    endLine < editor.document.lineCount - 1 &&
    /^\s*\|.*\|\s*$/.test(editor.document.lineAt(endLine + 1).text)
  ) {
    endLine++;
  }
  return { startLine, endLine };
}

// Get table lines in range
function getTableLines(
  editor: vscode.TextEditor,
  startLine: number,
  endLine: number
): string[] {
  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    lines.push(editor.document.lineAt(i).text);
  }
  return lines;
}
