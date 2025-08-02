import * as vscode from 'vscode';

export class OrgDocumentLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const links: vscode.DocumentLink[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text))) {
        const linkText = match[1];
        const start = match.index + 2;
        const end = start + linkText.length;
        const range = new vscode.Range(line, start, line, end);
        let uri: vscode.Uri;
        if (/^https?:\/\//.test(linkText)) {
          // Open http(s) links in the browser
          uri = vscode.Uri.parse(linkText);
        } else {
          // Interpret as a file path
          uri = vscode.Uri.file(
            require('path').resolve(document.uri.fsPath, '..', linkText)
          );
        }
        links.push(new vscode.DocumentLink(range, uri));
      }
    }
    return links;
  }
}
