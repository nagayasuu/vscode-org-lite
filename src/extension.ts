// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ORG_LANGUAGE } from './constants';
import { OrgDocumentLinkProvider } from './orgDocumentLinkProvider';
import { OrgDocumentSymbolProvider } from './orgDocumentSymbolProvider';
import { OrgPathCompletionProvider } from './orgPathCompletionProvider';
import { OrgTableCommandManager } from './orgTableCommandManager';
import { OrgTaskCommandManager } from './orgTaskCommandManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  registerCommands(context);

  const providers = registerProviders();
  context.subscriptions.push(...providers);
}

function registerCommands(context: vscode.ExtensionContext) {
  // Register command managers (they handle their own disposables)
  OrgTableCommandManager.registerCommands(context);
  OrgTaskCommandManager.registerCommands(context);
}

function registerProviders(): vscode.Disposable[] {
  return [
    vscode.languages.registerDocumentSymbolProvider(
      ORG_LANGUAGE,
      new OrgDocumentSymbolProvider()
    ),
    vscode.languages.registerDocumentLinkProvider(
      ORG_LANGUAGE,
      new OrgDocumentLinkProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      'org',
      new OrgPathCompletionProvider(),
      '[',
      '/'
    ),
  ];
}

// This method is called when your extension is deactivated
export function deactivate() {}
