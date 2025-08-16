import * as vscode from 'vscode';
import * as taskCommands from './orgTaskCommands';

export class OrgTaskCommandManager {
  public static registerCommands(context: vscode.ExtensionContext): void {
    const commandRegistrations = [
      {
        command: 'org-lite.rotateTaskState',
        callback: () => taskCommands.rotateTaskState(false),
      },
      {
        command: 'org-lite.rotateTaskStateReverse',
        callback: () => taskCommands.rotateTaskState(true),
      },
    ];

    for (const { command, callback } of commandRegistrations) {
      context.subscriptions.push(
        vscode.commands.registerCommand(command, async () => callback())
      );
    }
  }
}
