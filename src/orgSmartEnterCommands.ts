import * as vscode from 'vscode';

export async function smartEnter(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;

  if (doc.languageId !== 'org') {
    await vscode.commands.executeCommand('default:type', { text: '\n' });
    return;
  }

  const pos = editor.selection.active;
  const line = doc.lineAt(pos.line);
  const text = line.text;

  const isListLine = (lineText: string) => /^\s*-\s/.test(lineText);

  if (isListLine(text)) {
    // If the list line is blank or contains only "- "
    if (/^\s*-\s*$/.test(text)) {
      // Delete the entire line and move the cursor to the beginning of the line
      await editor.edit(editBuilder => {
        const start = new vscode.Position(pos.line, 0);
        const end = new vscode.Position(pos.line, text.length);
        editBuilder.delete(new vscode.Range(start, end));
      });
      const newPos = new vscode.Position(pos.line, 0);
      editor.selection = new vscode.Selection(newPos, newPos);
      return;
    } else {
      // If the list line contains content, insert a new line and "- "
      await vscode.commands.executeCommand('default:type', { text: '\n- ' });
      return;
    }
  }

  const isNumberListLine = (lineText: string) => /^\s*\d+\.\s/.test(lineText);

  if (isNumberListLine(text)) {
    const match = text.match(/^(\s*)(\d+)\.\s*(.*)$/);
    if (match) {
      const [, , numStr, content] = match;
      const num = parseInt(numStr, 10);

      // If the numbered list line is blank or contains only "1. "
      if (!content) {
        await editor.edit(editBuilder => {
          const start = new vscode.Position(pos.line, 0);
          const end = new vscode.Position(pos.line, text.length);
          editBuilder.delete(new vscode.Range(start, end));
        });
        const newPos = new vscode.Position(pos.line, 0);
        editor.selection = new vscode.Selection(newPos, newPos);
        return;
      } else {
        // If the numbered list line contains content, insert a new line and the next number
        const nextNum = num + 1;
        await vscode.commands.executeCommand('default:type', {
          text: `\n${nextNum}. `,
        });
        return;
      }
    }
  }

  // If not a list line, insert a normal newline
  await vscode.commands.executeCommand('default:type', { text: '\n' });
}
