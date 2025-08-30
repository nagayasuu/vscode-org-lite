import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class OrgPathCompletionProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ) {
    const line = document.lineAt(position.line).text;
    const prefix = line.slice(0, position.character);

    // Check if it starts with [[ or is immediately after [[
    const match = prefix.match(/\[\[([^\]]*)$/);

    if (!match) return;

    const inputPath = match[1] || '';
    const baseDir = path.dirname(document.uri.fsPath);
    const absDir = path.resolve(baseDir, inputPath.replace(/[^/\\]*$/, ''));

    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return;

    const items: vscode.CompletionItem[] = [];

    for (const file of fs.readdirSync(absDir)) {
      const filePath = path.join(absDir, file);
      const isDir = fs.statSync(filePath).isDirectory();
      const item = new vscode.CompletionItem(
        file,
        isDir
          ? vscode.CompletionItemKind.Folder
          : vscode.CompletionItemKind.File
      );
      item.insertText = isDir ? file + '/' : file;

      if (isDir) {
        // Enable recursive suggestion: when user selects this folder, trigger further completion
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Suggest',
        };
      }
      items.push(item);
    }
    return items;
  }
}
