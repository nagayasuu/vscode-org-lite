import * as vscode from 'vscode';

export class OrgTableManager {
  /**
   * org-mode table formatting command
   */
  public static registerCommands(context: vscode.ExtensionContext): void {
    const moveColLeftDisposable = vscode.commands.registerCommand(
      'org-lite.tableMoveColumnLeft',
      async () => {
        await moveTableColumn(-1);
      }
    );
    context.subscriptions.push(moveColLeftDisposable);

    const moveColRightDisposable = vscode.commands.registerCommand(
      'org-lite.tableMoveColumnRight',
      async () => {
        await moveTableColumn(1);
      }
    );
    context.subscriptions.push(moveColRightDisposable);

    // Register org-lite.tableEnterAction command
    const enterDisposable = vscode.commands.registerCommand(
      'org-lite.tableEnterAction',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'org') {
          return;
        }
        const pos = editor.selection.active;
        const lineText = editor.document.lineAt(pos.line).text;
        const tableLine = isTableLine(lineText);
        if (!tableLine) return;
        const { startLine, endLine } = detectTableRange(editor, pos.line);
        // Header row detection: is the first row of the table
        const isHeader = pos.line === startLine;
        if (isHeader) {
          // Add a new column (refactored to insertColumn)
          await insertColumn(editor, startLine, endLine, pos.line);
        } else {
          // Always reformat the table before moving the cursor
          const tableLines = getTableLines(editor, startLine, endLine);
          const rows = splitTableRows(tableLines);
          const colWidths = calcColWidths(rows);
          await formatTable(editor, startLine, endLine, rows, colWidths);
          // Move vertically to the cell below, or add a new row if at the last row
          if (pos.line === endLine) {
            // Add a new empty row and move the cursor to the beginning of the same column
            const emptyRow = formatEmptyRow(colWidths);
            await editor.edit(editBuilder => {
              const lastLine = editor.document.lineAt(endLine).range.end;
              editBuilder.insert(lastLine, '\n' + emptyRow);
            });
            // Calculate the current cell position
            const cellMatches = [...lineText.matchAll(/\|/g)];
            let cellIdx = 0;
            for (let i = 0; i < cellMatches.length - 1; i++) {
              const start = cellMatches[i].index ?? 0;
              const end = cellMatches[i + 1].index ?? 0;
              if (pos.character >= start && pos.character < end) {
                cellIdx = i;
                break;
              }
            }
            // Move the cursor to the beginning of the same cell in the new row
            const newRowText = emptyRow;
            const newCellMatches = [...newRowText.matchAll(/\|/g)];
            let offset = 0;
            if (cellIdx < newCellMatches.length - 1) {
              offset = newCellMatches[cellIdx].index ?? 0;
              offset++;
              if (newRowText[offset] === ' ') offset++;
            } else {
              // fallback: first column
              offset = newRowText.indexOf('| ') + 2;
            }
            const newPos = new vscode.Position(pos.line + 1, offset);
            editor.selection = new vscode.Selection(newPos, newPos);
          } else if (pos.line + 1 <= endLine) {
            const nextRowText = editor.document.lineAt(pos.line + 1).text;
            const cellMatches = [...lineText.matchAll(/\|/g)];
            let cellIdx = 0;
            for (let i = 0; i < cellMatches.length - 1; i++) {
              const start = cellMatches[i].index ?? 0;
              const end = cellMatches[i + 1].index ?? 0;
              if (pos.character >= start && pos.character < end) {
                cellIdx = i;
                break;
              }
            }
            const nextCellMatches = [...nextRowText.matchAll(/\|/g)];
            if (cellIdx < nextCellMatches.length - 1) {
              let offset = nextCellMatches[cellIdx].index ?? 0;
              offset++;
              if (nextRowText[offset] === ' ') offset++;
              const newPos = new vscode.Position(pos.line + 1, offset);
              editor.selection = new vscode.Selection(newPos, newPos);
            }
          }
        }
      }
    );
    context.subscriptions.push(enterDisposable);

    // Register org-lite.tableShiftTabAction command
    const shiftTabDisposable = vscode.commands.registerCommand(
      'org-lite.tableShiftTabAction',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'org') {
          return;
        }
        const pos = editor.selection.active;
        const lineText = editor.document.lineAt(pos.line).text;
        const tableLine = isTableLine(lineText);
        if (tableLine) {
          const { startLine, endLine } = detectTableRange(editor, pos.line);
          const tableLines = getTableLines(editor, startLine, endLine);
          const rows = splitTableRows(tableLines);
          const colWidths = calcColWidths(rows);
          // Always reformat the table before moving the cursor
          await formatTable(editor, startLine, endLine, rows, colWidths);
          const prevCellPos = getPrevCellPosition(
            editor,
            pos,
            startLine,
            endLine
          );
          if (prevCellPos) {
            editor.selection = new vscode.Selection(prevCellPos, prevCellPos);
          }
        }
      }
    );
    context.subscriptions.push(shiftTabDisposable);

    // Register org-lite.tableTabAction command
    const formatTableDisposable = vscode.commands.registerCommand(
      'org-lite.tableTabAction',
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'org') {
          return;
        }
        const pos = editor.selection.active;
        const lineText = editor.document.lineAt(pos.line).text;
        // Use table line detection function
        const tableLine = isTableLine(lineText);
        if (tableLine) {
          // Table formatting process
          const { startLine, endLine } = detectTableRange(editor, pos.line);
          const tableLines = getTableLines(editor, startLine, endLine);
          const rows = splitTableRows(tableLines);
          const colWidths = calcColWidths(rows);

          // If the current line is a separator line, format it as a separator
          if (isSeparatorLine(lineText)) {
            await insertSeparatorLine(editor, pos.line, colWidths);
            return;
          }

          // Always reformat the table before moving the cursor
          await formatTable(editor, startLine, endLine, rows, colWidths);

          // Tab key cell navigation
          let nextCellPos = getNextCellPosition(
            editor,
            pos,
            startLine,
            endLine
          );

          if (nextCellPos) {
            let nextLine = nextCellPos.line;
            let nextChar = nextCellPos.character;
            // If the destination is a separator line, move to the first cell of the next line
            if (
              nextLine < editor.document.lineCount &&
              isSeparatorLine(editor.document.lineAt(nextLine).text)
            ) {
              // First cell of the next line
              if (nextLine + 1 < editor.document.lineCount) {
                const afterSepLine = editor.document.lineAt(nextLine + 1).text;
                const firstCell = afterSepLine.indexOf('| ');
                if (firstCell !== -1) {
                  nextCellPos = new vscode.Position(
                    nextLine + 1,
                    firstCell + 2
                  );
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
          // Move the cursor precisely to just after the "| " of the newly added empty row (the beginning of the first cell)
          const nextLine = formatEmptyRow(colWidths);
          let idx = nextLine.indexOf('| ') + 2;
          const newPos = new vscode.Position(pos.line + 1, idx);
          editor.selection = new vscode.Selection(newPos, newPos);
        }
      }
    );
    context.subscriptions.push(formatTableDisposable);
    // Update context key when cursor moves or editor changes
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(updateOrgTableCellFocus)
    );
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(updateOrgTableCellFocus)
    );
  }
}

// direction: -1 (left), +1 (right)
async function moveTableColumn(direction: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  if (!isTableLine(lineText)) return;
  const { startLine, endLine } = detectTableRange(editor, pos.line);
  const tableLines = getTableLines(editor, startLine, endLine);
  const rows = splitTableRows(tableLines);
  // Determine the current cell index
  const cellMatches = [...lineText.matchAll(/\|/g)];
  let cellIdx = 0;
  for (let i = 0; i < cellMatches.length - 1; i++) {
    const start = cellMatches[i].index ?? 0;
    const end = cellMatches[i + 1].index ?? 0;
    if (pos.character >= start && pos.character < end) {
      cellIdx = i;
      break;
    }
  }
  // Get the maximum number of columns and pad all rows
  const maxCols = Math.max(
    ...rows
      .filter(r => !(r.length === 1 && r[0] === '__SEPARATOR__'))
      .map(r => r.length)
  );
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '__SEPARATOR__') continue;
    while (row.length < maxCols) row.push('');
  }
  // Check for left/right edge
  if (direction === -1 && cellIdx <= 0) return;
  if (direction === 1 && cellIdx >= maxCols - 1) return;
  // Swap columns
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === '__SEPARATOR__') continue;
    const from = cellIdx;
    const to = cellIdx + direction;
    if (to >= 0 && to < row.length) {
      const tmp = row[from];
      row[from] = row[to];
      row[to] = tmp;
    }
  }
  // Reformat
  const colWidths = calcColWidths(rows);
  await formatTable(editor, startLine, endLine, rows, colWidths);
  // Move the cursor
  const newLine = pos.line;
  const newRowText = editor.document.lineAt(newLine).text;
  const newCellMatches = [...newRowText.matchAll(/\|/g)];
  let offset = 0;
  const newCellIdx = cellIdx + direction;
  if (newCellIdx >= 0 && newCellIdx < newCellMatches.length - 1) {
    offset = newCellMatches[newCellIdx].index ?? 0;
    offset++;
    if (newRowText[offset] === ' ') offset++;
  } else {
    offset = newRowText.indexOf('| ') + 2;
  }
  const newPos = new vscode.Position(newLine, offset);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// Insert a new column at the end of the table
async function insertColumn(
  editor: vscode.TextEditor,
  startLine: number,
  endLine: number,
  cursorLine: number
) {
  await editor.edit(editBuilder => {
    for (let i = startLine; i <= endLine; i++) {
      const rowText = editor.document.lineAt(i).text;
      if (isSeparatorLine(rowText)) {
        // Insert "+--" before the last "|" at the end
        const lastBar = rowText.lastIndexOf('|');
        const newSep =
          rowText.slice(0, lastBar) + '+--' + rowText.slice(lastBar);
        editBuilder.replace(editor.document.lineAt(i).range, newSep);
      } else {
        // Insert " | " just before the last "|"
        const lastBar = rowText.lastIndexOf('|');
        const newRow =
          rowText.slice(0, lastBar) + '|  ' + rowText.slice(lastBar);
        editBuilder.replace(editor.document.lineAt(i).range, newRow);
      }
    }
  });
  // Move the cursor to the beginning of the new column
  const lineText = editor.document.lineAt(cursorLine).text;
  // Just before the last '|'
  const newPos = new vscode.Position(cursorLine, lineText.length - 2);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// Function to return the position to move to the previous cell or previous row's last cell with Shift+Tab
function getPrevCellPosition(
  editor: vscode.TextEditor,
  pos: vscode.Position,
  startLine: number,
  endLine: number
): vscode.Position | null {
  const currentRowText = editor.document.lineAt(pos.line).text;
  const cellMatches = [...currentRowText.matchAll(/\|/g)];
  let cellIdx = 0;
  for (let i = 0; i < cellMatches.length - 1; i++) {
    const start = cellMatches[i].index ?? 0;
    const end = cellMatches[i + 1].index ?? 0;
    if (pos.character > start && pos.character <= end) {
      cellIdx = i;
      break;
    }
  }
  // If at the beginning of the line (first cell), move to the last cell of the previous row
  if (cellIdx === 0 && pos.line > startLine) {
    let prevLine = pos.line - 1;
    // Skip separator lines
    while (
      prevLine >= startLine &&
      isSeparatorLine(editor.document.lineAt(prevLine).text)
    ) {
      prevLine--;
    }
    if (prevLine >= startLine) {
      const prevRowText = editor.document.lineAt(prevLine).text;
      const prevCellMatches = [...prevRowText.matchAll(/\|/g)];
      if (prevCellMatches.length >= 2) {
        // Start of the last cell
        const lastCellStart =
          prevCellMatches[prevCellMatches.length - 2].index ?? 0;
        let offset = lastCellStart + 1;
        if (prevRowText[offset] === ' ') offset++;
        return new vscode.Position(prevLine, offset);
      }
    }
  } else if (cellIdx > 0) {
    // Previous cell
    const prevCellStart = cellMatches[cellIdx - 1].index ?? 0;
    let offset = prevCellStart + 1;
    if (currentRowText[offset] === ' ') offset++;
    return new vscode.Position(pos.line, offset);
  }
  return null;
}

// Function to return the position to move to the next cell or the first cell of the next row with Tab key
function getNextCellPosition(
  editor: vscode.TextEditor,
  pos: vscode.Position,
  startLine: number,
  endLine: number
): vscode.Position | null {
  const currentRowText = editor.document.lineAt(pos.line).text;
  const cellMatches = [...currentRowText.matchAll(/\|/g)];
  let cellIdx = 0;
  for (let i = 0; i < cellMatches.length - 1; i++) {
    const start = cellMatches[i].index ?? 0;
    const end = cellMatches[i + 1].index ?? 0;
    if (pos.character >= start && pos.character < end) {
      cellIdx = i;
      break;
    }
  }
  // If at the end of the line, always set cellIdx to the last cell section
  if (pos.character === currentRowText.length && cellMatches.length >= 2) {
    cellIdx = cellMatches.length - 2;
  }
  // Move to next cell in the row, or first cell of next row
  if (cellIdx < cellMatches.length - 2) {
    // Next cell in the same row
    const nextCellStart = cellMatches[cellIdx + 1].index ?? 0;
    // Skip space after '|'
    let offset = nextCellStart + 1;
    if (currentRowText[offset] === ' ') offset++;
    return new vscode.Position(pos.line, offset);
  } else if (pos.line < endLine) {
    // First cell of next row
    const nextRowText = editor.document.lineAt(pos.line + 1).text;
    if (isSeparatorLine(nextRowText) && pos.line + 2 <= endLine) {
      // If the next line is a separator, move to the first cell of the line after next
      const afterSepText = editor.document.lineAt(pos.line + 2).text;
      const firstCell = afterSepText.indexOf('| ');
      if (firstCell !== -1) {
        return new vscode.Position(pos.line + 2, firstCell + 2);
      }
    } else {
      const firstCell = nextRowText.indexOf('| ');
      if (firstCell !== -1) {
        return new vscode.Position(pos.line + 1, firstCell + 2);
      }
    }
  }
  return null;
}

// Calculate column widths
function calcColWidths(rows: string[][]): number[] {
  // Exclude separator rows (['__SEPARATOR__']) from width calculation
  const dataRows = rows.filter(
    row => !(row.length === 1 && row[0] === '__SEPARATOR__')
  );
  const colCount = Math.max(...dataRows.map(r => r.length), 0);
  const colWidths = Array(colCount).fill(0);
  for (const row of dataRows) {
    for (let c = 0; c < colCount; c++) {
      colWidths[c] = Math.max(colWidths[c], getDisplayWidth(row[c] || ''));
    }
  }
  return colWidths;
}

// Separator line detection
function isSeparatorLine(text: string): boolean {
  // Lines starting with "|-", or lines composed only of "|", "-", and "+"
  return /^\|[-+| ]*$/.test(text.trim()) && text.includes('-');
}

// Function to get the latest column widths of the current table range
function getLatestColWidths(editor: vscode.TextEditor, line: number): number[] {
  let startLine = line,
    endLine = line;
  const doc = editor.document;
  // Search upwards
  while (startLine > 0 && isTableLine(doc.lineAt(startLine - 1).text)) {
    startLine--;
  }
  // Search downwards
  while (
    endLine < doc.lineCount - 1 &&
    isTableLine(doc.lineAt(endLine + 1).text)
  ) {
    endLine++;
  }
  const tableLines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const t = doc.lineAt(i).text;
    if (!isSeparatorLine(t)) tableLines.push(t);
  }
  const rows = splitTableRows(tableLines);
  const colWidths = calcColWidths(rows);
  // If the number of columns is 0, use 2 columns with width 3
  return colWidths.length === 0 ? [3, 3] : colWidths;
}

// Format and insert separator line and empty row
async function insertSeparatorLine(
  editor: vscode.TextEditor,
  line: number,
  colWidths: number[]
) {
  colWidths = getLatestColWidths(editor, line);
  // Get the original indentation
  const origLine = editor.document.lineAt(line).text;
  const m = origLine.match(/^([ \t]*)/);
  const indent = m ? m[1] : '';
  const sep = indent + formatSeparatorLine(colWidths);
  const emptyRow = indent + formatEmptyRow(colWidths);
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
    if (row.length === 1 && row[0] === '__SEPARATOR__') {
      return indent + formatSeparatorLine(colWidths);
    }
    return indent + formatTableRow(row, colWidths);
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
  colWidths: number[]
) {
  // Get the indentation of the previous line
  const origLine = editor.document.lineAt(endLine).text;
  const m = origLine.match(/^([ \t]*)/);
  const indent = m ? m[1] : '';
  const emptyRow = indent + formatEmptyRow(colWidths);
  const lastLine = editor.document.lineAt(endLine).range.end;
  await editor.edit(editBuilder => {
    editBuilder.insert(lastLine, '\n' + emptyRow);
  });
}

// Table line detection function (any string starting with '|')
function isTableLine(text: string): boolean {
  // Allow leading indentation (spaces or tabs), and consider a line as a table line if it starts with a '|'
  return /^[ \t]*\|.*/.test(text);
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

// Split table rows into cells
function splitTableRows(tableLines: string[]): string[][] {
  return tableLines.map(line => {
    if (isSeparatorLine(line)) {
      // Separator lines are stored as arrays with a special flag
      return ['__SEPARATOR__'];
    }
    // Treat empty cells as empty elements, but exclude leading/trailing empty elements
    return splitTableLineToCells(line);
  });
}

// Helper: Split a table line into cells, excluding leading/trailing empty elements
function splitTableLineToCells(line: string): string[] {
  let cells = line.trim().split(/\s*\|\s*/);
  if (cells.length > 0 && cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

// Display width calculation function (full-width: 2, half-width: 1)
function getDisplayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    width +=
      /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF01-\uFF60\uFFE0-\uFFE6\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(
        ch
      )
        ? 2
        : 1;
  }
  return width;
}

// Format separator line
function formatSeparatorLine(colWidths: number[]): string {
  return '|' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '|';
}

// Format empty row
function formatEmptyRow(colWidths: number[]): string {
  return '| ' + colWidths.map(w => ' '.repeat(w)).join(' | ') + ' |';
}

// Format table row
function formatTableRow(row: string[], colWidths: number[]): string {
  return (
    '| ' +
    colWidths
      .map((w, c) => {
        const cell = row[c] || '';
        const padLen = w - getDisplayWidth(cell);
        return cell + ' '.repeat(padLen);
      })
      .join(' | ') +
    ' |'
  );
}

// orgTableCellFocus context key management function (declared outside the class)
function updateOrgTableCellFocus() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    vscode.commands.executeCommand('setContext', 'orgTableCellFocus', false);
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const tableLine = isTableLine(lineText);
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
