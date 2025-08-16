import * as vscode from 'vscode';
import * as orgTaskUtils from '../utils/orgTaskUtils';

export function rotateTaskState(reverse: boolean = false): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  if (editor.document.languageId !== 'org') {
    vscode.window.showWarningMessage(
      'This command is only available in Org files'
    );
    return;
  }

  const position = editor.selection.active;
  const lineText = editor.document.lineAt(position.line).text;

  if (!orgTaskUtils.isHeadingLine(lineText)) {
    vscode.window.showInformationMessage('Cursor must be on a heading line');
    return;
  }

  const newLineText = orgTaskUtils.replaceTaskState(lineText, reverse);

  const range = new vscode.Range(
    position.line,
    0,
    position.line,
    lineText.length
  );

  editor.edit(editBuilder => editBuilder.replace(range, newLineText));
}
