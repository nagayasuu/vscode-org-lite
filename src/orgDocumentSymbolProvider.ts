import * as vscode from 'vscode';

export class OrgDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();

    // Detect line ending (CRLF, LF, or CR)
    const match = text.match(/\r\n|\r|\n/);

    const lineEnding = match ? match[0] : '\n';
    const lines = text.split(lineEnding);
    const headingRegex = /^([ \t]*)(\*+)\s+(.+)$/;

    // Extract headings
    const headings: Array<{ title: string; level: number; start: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const match = headingRegex.exec(lines[i]);

      if (!match) continue;

      const indent = match[1] || '';
      const stars = match[2];
      const title = match[3].trim() || 'Untitled';
      const level = stars.length + Math.floor(indent.length / 2);

      headings.push({ title, level, start: i });
    }

    // Hierarchical structure, range calculation, and DocumentSymbol generation
    const result: vscode.DocumentSymbol[] = [];

    const stack: Array<{ symbol: vscode.DocumentSymbol; level: number }> = [];

    for (let idx = 0; idx < headings.length; idx++) {
      const { title, level, start } = headings[idx];
      // The range extends until the next heading at the same or higher level
      let end = lines.length;

      for (let j = idx + 1; j < headings.length; j++) {
        if (headings[j].level <= level) {
          end = headings[j].start;
          break;
        }
      }
      const range = new vscode.Range(start, 0, end, 0);
      const symbol = new vscode.DocumentSymbol(
        title,
        '',
        vscode.SymbolKind.String,
        range,
        range
      );

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(symbol);
      } else {
        stack[stack.length - 1].symbol.children.push(symbol);
      }
      stack.push({ symbol, level });
    }
    return result;
  }
}
