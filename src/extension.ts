// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { showAgendaView } from './orgAgendaView';
import { OrgDocumentSymbolProvider } from './orgDocumentSymbolProvider';
import { OrgTaskManager } from './orgTaskManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Register TODO rotation commands
  OrgTaskManager.registerCommands(context);

  // Register Document Symbol Provider for Outline view
  const documentSymbolProvider =
    vscode.languages.registerDocumentSymbolProvider(
      { language: 'org' },
      new OrgDocumentSymbolProvider()
    );

  context.subscriptions.push(documentSymbolProvider);

  const showAgendaCommand = vscode.commands.registerCommand(
    'org-lite.showAgenda',
    showAgendaView
  );
  context.subscriptions.push(showAgendaCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
