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
    if (!editor) {
      return;
    }

    // Check if current file is .org file
    if (editor.document.languageId !== 'org') {
      vscode.window.showWarningMessage(
        'This command is only available in Org files'
      );
      return;
    }

    const position = editor.selection.active;
    const line = editor.document.lineAt(position.line);
    const lineText = line.text;

    // Check if current line is a heading
    let headingMatch;
    let stars: string = '';
    let content: string = '';
    let indent: string = '';

    headingMatch = lineText.match(/^(\s*)(\*)\s+(.+)$/);
    if (headingMatch) {
      // For indented headings, preserve the indentation
      indent = headingMatch[1];
      stars = headingMatch[2];
      content = headingMatch[3];
    }

    if (!headingMatch) {
      vscode.window.showInformationMessage('Cursor must be on a heading line');
      return;
    }

    let newLineText: string;

    if (reverse) {
      // Reverse direction: DONE -> TODO -> (unmarked)
      if (content.startsWith('DONE ')) {
        // DONE -> TODO
        newLineText = `${indent}${stars} TODO ${content.substring(5)}`;
      } else if (content.startsWith('TODO ')) {
        // TODO -> (unmarked)
        newLineText = `${indent}${stars} ${content.substring(5)}`;
      } else {
        // (unmarked) -> DONE
        newLineText = `${indent}${stars} DONE ${content}`;
      }
    } else {
      // Forward direction: (unmarked) -> TODO -> DONE
      if (content.startsWith('TODO ')) {
        // TODO -> DONE
        newLineText = `${indent}${stars} DONE ${content.substring(5)}`;
      } else if (content.startsWith('DONE ')) {
        // DONE -> (unmarked)
        newLineText = `${indent}${stars} ${content.substring(5)}`;
      } else {
        // (unmarked) -> TODO
        newLineText = `${indent}${stars} TODO ${content}`;
      }
    }

    // Replace text
    const range = new vscode.Range(
      position.line,
      0,
      position.line,
      lineText.length
    );

    editor.edit(editBuilder => {
      editBuilder.replace(range, newLineText);
    });
  }
}
