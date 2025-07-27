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
        if (tableLine && pos.character === lineText.length) {
          // Table formatting process
          let startLine = pos.line;
          let endLine = pos.line;
          // Table range detection: only target table lines
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
          const tableLines: string[] = [];
          for (let i = startLine; i <= endLine; i++) {
            tableLines.push(editor.document.lineAt(i).text);
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

          // Split table rows (normal rows only)
          const rows = tableLines.map(line =>
            line
              .trim()
              .split(/\s*\|\s*/)
              .filter(cell => cell.length > 0)
          );

          // Number of columns
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

          // Format table rows (normal rows only)
          const formatted = rows.map(row => {
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
          });
          // Always add an empty row
          formatted.push(
            '| ' + colWidths.map((w, c) => ' '.repeat(w)).join(' | ') + ' |'
          );

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

          // Move the cursor precisely to just after the "| " of the newly added empty row (the beginning of the first cell)
          const nextLineIdx = formatted.length - 1;
          const nextLine = formatted[nextLineIdx];
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

// Table line detection function (any string starting with '|')
function isTableLine(text: string): boolean {
  return /^\|.*/.test(text);
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
