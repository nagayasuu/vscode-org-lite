import * as vscode from 'vscode';
import * as tableCommands from './commands/orgTableCommands';

export class OrgTableCommandManager {
  public static registerCommands(context: vscode.ExtensionContext): void {
    const commandRegistrations = [
      {
        command: 'org-lite.tableDeleteColumn',
        callback: () => tableCommands.deleteTableColumn(),
      },
      {
        command: 'org-lite.formatOrgTable',
        callback: () => tableCommands.formatOrgTable(),
      },
      {
        command: 'org-lite.tableMoveColumnLeft',
        callback: () => tableCommands.moveTableColumn(-1),
      },
      {
        command: 'org-lite.tableMoveColumnRight',
        callback: () => tableCommands.moveTableColumn(1),
      },
      {
        command: 'org-lite.onTableEnter',
        callback: () => tableCommands.onTableEnter(),
      },
      {
        command: 'org-lite.moveToPrevTableCell',
        callback: () => tableCommands.moveToPrevTableCell(),
      },
      {
        command: 'org-lite.tableTabAction',
        callback: () => tableCommands.tableTabAction(),
      },
    ];

    for (const { command, callback } of commandRegistrations) {
      context.subscriptions.push(
        vscode.commands.registerCommand(command, async () => callback())
      );
    }

    // Update context keys for line and cell focus in org tables
    context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(
        tableCommands.updateOrgTableLineFocus
      ),
      vscode.window.onDidChangeActiveTextEditor(
        tableCommands.updateOrgTableLineFocus
      ),
      vscode.window.onDidChangeTextEditorSelection(
        tableCommands.updateOrgTableCellFocus
      ),
      vscode.window.onDidChangeActiveTextEditor(
        tableCommands.updateOrgTableCellFocus
      )
    );
  }
}
