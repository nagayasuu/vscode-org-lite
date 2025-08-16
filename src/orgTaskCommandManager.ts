import * as vscode from 'vscode';
import * as taskCommands from './commands/orgTaskCommands';

/**
 * TODO Rotation functionality for Org mode files
 */
export class OrgTaskCommandManager {
  /**
   * Register TODO rotation commands
   */
  public static registerCommands(context: vscode.ExtensionContext): void {
    // Rotate TODO command (forward)
    const rotateTodoDisposable = vscode.commands.registerCommand(
      'org-lite.rotateTodo',
      () => {
        taskCommands.rotateTodoState(false);
      }
    );

    // Rotate TODO command (reverse)
    const rotateTodoReverseDisposable = vscode.commands.registerCommand(
      'org-lite.rotateTodoReverse',
      () => {
        taskCommands.rotateTodoState(true);
      }
    );

    context.subscriptions.push(rotateTodoDisposable);
    context.subscriptions.push(rotateTodoReverseDisposable);
  }
}
