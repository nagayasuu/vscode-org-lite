import * as vscode from 'vscode';

export class OrgTableManager {
  /**
   * org-mode table formatting command
   */
  public static registerCommands(context: vscode.ExtensionContext): void {
    // Register org-lite.formatTableOnTab command
    const formatTableDisposable = vscode.commands.registerCommand(
      'org-lite.formatTableOnTab',
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

          if (isSeparatorLine(lineText)) {
            await formatAndInsertSeparator(editor, pos.line, colWidths);
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
          const nextLineIdx = rows.length; // formatted.length - 1
          const nextLine = formatEmptyRow(colWidths);
          let idx = nextLine.indexOf('| ') + 2;
          const newPos = new vscode.Position(pos.line + 1, idx);
          editor.selection = new vscode.Selection(newPos, newPos);
        }
        // ...existing code...
        // Calculate column widths
        function calcColWidths(rows: string[][]): number[] {
          const colCount = Math.max(...rows.map(r => r.length));
          const colWidths = Array(colCount).fill(0);
          for (const row of rows) {
            for (let c = 0; c < colCount; c++) {
              colWidths[c] = Math.max(
                colWidths[c],
                getDisplayWidth(row[c] || '')
              );
            }
          }
          return colWidths;
        }

        // Separator line detection
        function isSeparatorLine(text: string): boolean {
          return /^\|[-+ ]*\|$/.test(text.trim());
        }

        // Format and insert separator line and empty row
        async function formatAndInsertSeparator(
          editor: vscode.TextEditor,
          line: number,
          colWidths: number[]
        ) {
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
          const formatted = rows.map(row => formatTableRow(row, colWidths));
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
            editBuilder.insert(
              lastLine,
              '\n' + formatted[formatted.length - 1]
            );
          });
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
  return tableLines.map(line =>
    line
      .trim()
      .split(/\s*\|\s*/)
      .filter(cell => cell.length > 0)
  );
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
