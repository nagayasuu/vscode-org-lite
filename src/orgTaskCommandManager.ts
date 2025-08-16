import * as vscode from 'vscode';
import * as taskCommands from './commands/orgTaskCommands';

export class OrgTaskCommandManager {
  public static registerCommands(context: vscode.ExtensionContext): void {
    const commandRegistrations = [
      {
        command: 'org-lite.rotateTodo',
        callback: () => taskCommands.rotateTodoState(false),
      },
      {
        command: 'org-lite.rotateTodoReverse',
        callback: () => taskCommands.rotateTodoState(true),
      },
    ];

    for (const { command, callback } of commandRegistrations) {
      context.subscriptions.push(
        vscode.commands.registerCommand(command, async () => callback())
      );
    }
  }
}
