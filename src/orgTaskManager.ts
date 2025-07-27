import * as vscode from 'vscode';

/**
 * TODO Rotation functionality for Org mode files
 */
export class OrgTaskManager {
  /**
   * Register TODO rotation commands
   */
  public static registerCommands(context: vscode.ExtensionContext): void {
    // Rotate TODO command (forward)
    const rotateTodoDisposable = vscode.commands.registerCommand(
      'org-lite.rotateTodo',
      () => {
        this.rotateTodoState(false);
      }
    );

    // Rotate TODO command (reverse)
    const rotateTodoReverseDisposable = vscode.commands.registerCommand(
      'org-lite.rotateTodoReverse',
      () => {
        this.rotateTodoState(true);
      }
    );

    context.subscriptions.push(rotateTodoDisposable);
    context.subscriptions.push(rotateTodoReverseDisposable);
  }

  /**
   * Rotate TODO states on the current line
   */
  private static rotateTodoState(reverse: boolean = false): void {
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
    const headingMatch = lineText.match(/^(\s*)(\*)\s+(.*)$/);
    if (!headingMatch) {
      vscode.window.showInformationMessage('Cursor must be on a heading line');
      return;
    }
    const [, indent, stars, content] = headingMatch;

    let newLineText = '';
    const todo = 'TODO ';
    const done = 'DONE ';
    if (reverse) {
      if (content.startsWith(done)) {
        newLineText = `${indent}${stars} ${todo}${content.slice(done.length)}`;
      } else if (content.startsWith(todo)) {
        newLineText = `${indent}${stars} ${content.slice(todo.length)}`;
      } else {
        newLineText = `${indent}${stars} ${done}${content}`;
      }
    } else {
      if (content.startsWith(todo)) {
        newLineText = `${indent}${stars} ${done}${content.slice(todo.length)}`;
      } else if (content.startsWith(done)) {
        newLineText = `${indent}${stars} ${content.slice(done.length)}`;
      } else {
        newLineText = `${indent}${stars} ${todo}${content}`;
      }
    }

    const range = new vscode.Range(
      position.line,
      0,
      position.line,
      lineText.length
    );
    editor.edit(editBuilder => editBuilder.replace(range, newLineText));
  }
}
