import * as vscode from 'vscode';

export class OrgTableManager {
  /**
   * org-mode table formatting command
   */
  public static registerCommands(context: vscode.ExtensionContext): void {
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
            await formatAndInsertSeparator(editor, pos.line, colWidths);
            return;
          }

          // Tab key cell navigation
          const nextCellPos = getNextCellPosition(
            editor,
            pos,
            startLine,
            endLine
          );
          if (nextCellPos) {
            editor.selection = new vscode.Selection(nextCellPos, nextCellPos);
            return;
          }

          await formatAndInsertTable(
            editor,
            startLine,
            endLine,
            rows,
            colWidths
          );
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
      vscode.window.onDidChangeTextEditorSelection(updateOrgTableLineFocus)
    );
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(updateOrgTableLineFocus)
    );
  }
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
    const firstCell = nextRowText.indexOf('| ');
    if (firstCell !== -1) {
      return new vscode.Position(pos.line + 1, firstCell + 2);
    }
  }
  return null;
}

// Calculate column widths
function calcColWidths(rows: string[][]): number[] {
  const colCount = Math.max(...rows.map(r => r.length));
  const colWidths = Array(colCount).fill(0);
  for (const row of rows) {
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
async function formatAndInsertSeparator(
  editor: vscode.TextEditor,
  line: number,
  colWidths: number[]
) {
  // Get the latest column widths of the current table range
  colWidths = getLatestColWidths(editor, line);
  const sep = formatSeparatorLine(colWidths);
  const emptyRow = formatEmptyRow(colWidths);
  await editor.edit(editBuilder => {
    editBuilder.replace(editor.document.lineAt(line).range, sep);
    // Insert empty row below
    const sepEnd = editor.document.lineAt(line).range.end;
    editBuilder.insert(sepEnd, '\n' + emptyRow);
  });
  // Move cursor to just after "| " of the new empty row
  const newPos = new vscode.Position(line + 1, 2);
  editor.selection = new vscode.Selection(newPos, newPos);
}

// Format and insert table rows and empty row
async function formatAndInsertTable(
  editor: vscode.TextEditor,
  startLine: number,
  endLine: number,
  rows: string[][],
  colWidths: number[]
) {
  // Get the latest column widths of the current table range
  colWidths = getLatestColWidths(editor, startLine);
  const formatted = rows.map(row => {
    // Separator lines are regenerated with formatSeparatorLine
    if (row.length === 1 && row[0] === '__SEPARATOR__') {
      return formatSeparatorLine(colWidths);
    }
    return formatTableRow(row, colWidths);
  });
  formatted.push(formatEmptyRow(colWidths));
  await editor.edit(editBuilder => {
    for (let i = startLine; i <= endLine; i++) {
      editBuilder.replace(
        editor.document.lineAt(i).range,
        formatted[i - startLine]
      );
    }
    // Insert an empty row below the last line
    const lastLine = editor.document.lineAt(endLine).range.end;
    editBuilder.insert(lastLine, '\n' + formatted[formatted.length - 1]);
  });
}
// Table line detection function (any string starting with '|')
function isTableLine(text: string): boolean {
  return /^\|.*/.test(text);
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
  // First, estimate the maximum number of columns
  const cellCounts = tableLines
    .filter(line => !isSeparatorLine(line))
    .map(
      line =>
        line
          .trim()
          .split(/\s*\|\s*/)
          .filter(cell => cell.length > 0).length
    );
  const maxCols = cellCounts.length > 0 ? Math.max(...cellCounts) : 0;

  return tableLines.map(line => {
    if (isSeparatorLine(line)) {
      // Separator lines are stored as arrays with a special flag
      return ['__SEPARATOR__'];
    }
    return line
      .trim()
      .split(/\s*\|\s*/)
      .filter(cell => cell.length > 0);
  });
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

// orgTableLineFocus context key management function (declared outside the class)
function updateOrgTableLineFocus() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'org') {
    vscode.commands.executeCommand('setContext', 'orgTableLineFocus', false);
    return;
  }
  const pos = editor.selection.active;
  const lineText = editor.document.lineAt(pos.line).text;
  const tableLine = isTableLine(lineText);

  vscode.commands.executeCommand('setContext', 'orgTableLineFocus', tableLine);
}
