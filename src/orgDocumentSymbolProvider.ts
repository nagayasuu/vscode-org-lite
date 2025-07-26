import * as path from 'path';
import * as vscode from 'vscode';

export class OrgDocumentSymbolProvider
  implements vscode.DocumentSymbolProvider
{
  // Cache regex for better performance
  private static readonly HEADING_REGEX = /^(\s*)(\*)\s+(.+)$/;
  private static readonly PATH_REGEX = /([\/\\]?[\w\-\.\/\\]+(?:\.[\w]+)?)/g;
  private static readonly TODO_KEYWORDS_REGEX = /^(TODO|DONE)\s+(.*)$/;

  provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const text = document.getText();

    // Early return for empty documents
    if (!text.trim()) {
      return [];
    }

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
    // Quick scan to count potential headings (pre-allocate array)
    let headingCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('*') || line.match(/^\s+\*/)) headingCount++;
    }

    // Pre-allocate array with estimated size
    const symbolsWithLevel: Array<{
      symbol: vscode.DocumentSymbol;
      level: number;
      line: number;
    }> = new Array(headingCount);

    let symbolIndex = 0;

    // Get current workspace folder once
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const currentDir = workspaceFolder
      ? workspaceFolder.uri.fsPath
      : path.dirname(document.uri.fsPath);

    // Process lines for clean view mode
    for (let i = 0; i < lines.length; i++) {
      // Check cancellation less frequently (every 100 lines)
      if (i % 100 === 0 && token.isCancellationRequested) {
        return [];
      }

      const line = lines[i];

      // Clean view mode: support indented headings with space-based level calculation
      if (!line.trim().startsWith('*')) continue;

      const indentMatch = line.match(OrgDocumentSymbolProvider.HEADING_REGEX);
      if (!indentMatch) continue;

      const indent = indentMatch[1];
      const stars = indentMatch[2];
      let title = indentMatch[3].trim() || 'Untitled';

      // Calculate level based on both indentation and star count
      // Each 2 spaces of indentation = +1 level
      const indentLevel = Math.floor(indent.length / 2);
      const level = stars.length + indentLevel;

      // Apply clean view transformations (remove TODO keywords)
      title = this.applyCleanView(title, level);

      // Only convert paths if title contains path-like characters
      if (title.includes('/') || title.includes('\\')) {
        title = this.convertToRelativePath(title, currentDir);
      }

      // Create range for the heading line only
      const range = new vscode.Range(i, 0, i, line.length);

      const symbol = new vscode.DocumentSymbol(
        title,
        '',
        vscode.SymbolKind.String,
        range,
        range
      );

      symbolsWithLevel[symbolIndex++] = { symbol, level, line: i };
    }

    // Trim array to actual size
    symbolsWithLevel.length = symbolIndex;

    return this.buildHierarchy(symbolsWithLevel);
  }

  private convertToRelativePath(title: string, currentDir: string): string {
    // Use cached regex
    return title.replace(OrgDocumentSymbolProvider.PATH_REGEX, match => {
      try {
        // Check if it's an absolute path
        if (path.isAbsolute(match)) {
          const relativePath = path.relative(currentDir, match);
          // Only replace if the relative path is shorter or starts with ..
          return relativePath.length < match.length ||
            relativePath.startsWith('..')
            ? relativePath
            : match;
        }
      } catch (error) {
        // If path operations fail, return original
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
