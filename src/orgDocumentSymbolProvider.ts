import * as path from 'path';
import * as vscode from 'vscode';

export class OrgDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  // Regex cache for performance
  private static readonly HEADING_REGEX = /^(\s*)(\*)\s+(.+)$/;
  private static readonly PATH_REGEX = /([\/\\]?[\w\-\.\/\\]+(?:\.[\w]+)?)/g;
  private static readonly TODO_KEYWORDS_REGEX = /^(TODO|DONE)\s+(.*)$/;

  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();

    if (!text.trim()) return [];
    const lines = text.split('\n');
    return this.processCleanViewMode(lines, document, token);
  }

  /**
   * Process document symbols in clean view mode
   */
  private processCleanViewMode(
    lines: string[],
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.DocumentSymbol[] {
    // Pre-allocate array for headings
    const symbolsWithLevel: Array<{
      symbol: vscode.DocumentSymbol;
      level: number;
      line: number;
    }> = [];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const currentDir = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : path.dirname(document.uri.fsPath);
    for (let i = 0; i < lines.length; i++) {
      if (i % 100 === 0 && token.isCancellationRequested) return [];
      const line = lines[i];
      if (!line.trim().startsWith('*')) continue;
      const match = OrgDocumentSymbolProvider.HEADING_REGEX.exec(line);
      if (!match) continue;
      const [, indent, stars, rawTitle] = match;
      let title = rawTitle.trim() || 'Untitled';
      // Calculate level: each 2 spaces of indentation = +1 level
      const indentLevel = Math.floor(indent.length / 2);
      const level = stars.length + indentLevel;
      // Remove TODO keywords
      title = this.applyCleanView(title, level);
      // Convert paths if needed
      if (title.includes('/') || title.includes('\\')) {
        title = this.convertToRelativePath(title, currentDir);
      }
      const range = new vscode.Range(i, 0, i, line.length);
      const symbol = new vscode.DocumentSymbol(
        title,
        '',
        vscode.SymbolKind.String,
        range,
        range
      );
      symbolsWithLevel.push({ symbol, level, line: i });
    }
    return this.buildHierarchy(symbolsWithLevel);
  }

  private convertToRelativePath(title: string, currentDir: string): string {
    // Use cached regex
    return title.replace(OrgDocumentSymbolProvider.PATH_REGEX, match => {
      try {
        if (path.isAbsolute(match)) {
          const relativePath = path.relative(currentDir, match);
          return relativePath.length < match.length ||
            relativePath.startsWith('..')
            ? relativePath
            : match;
        }
      } catch (error) {
        console.warn('Path conversion failed:', error);
      }
      return match;
    });
  }

  private buildHierarchy(
    symbols: Array<{
      symbol: vscode.DocumentSymbol;
      level: number;
      line: number;
    }>
  ): vscode.DocumentSymbol[] {
    if (symbols.length === 0) {
      return [];
    }

    const result: vscode.DocumentSymbol[] = [];
    const stack: Array<{ symbol: vscode.DocumentSymbol; level: number }> = [];

    for (let i = 0; i < symbols.length; i++) {
      const { symbol, level } = symbols[i];

      // Pop stack until we find a valid parent (lower level number = higher in hierarchy)
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      // Add to appropriate parent or root
      if (stack.length === 0) {
        result.push(symbol);
      } else {
        stack[stack.length - 1].symbol.children.push(symbol);
      }

      // Push current symbol to stack
      stack.push({ symbol, level });
    }

    return result;
  }

  /**
   * Apply clean view transformations to the title
   */
  private applyCleanView(title: string, level: number): string {
    // Remove TODO keywords
    const todoMatch = title.match(
      OrgDocumentSymbolProvider.TODO_KEYWORDS_REGEX
    );
    if (todoMatch) {
      return todoMatch[2].trim();
    }
    return title;
  }
}
