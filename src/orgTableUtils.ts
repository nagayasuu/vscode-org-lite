import { ORG_TABLE_SEPARATOR } from './constants';

export function getCellIndexAtPosition(
  lineText: string,
  character: number
): number {
  const cellMatches = [...lineText.matchAll(/\|/g)];
  let cellIdx = 0;

  for (let i = 0; i < cellMatches.length - 1; i++) {
    const start = cellMatches[i].index ?? 0;
    const end = cellMatches[i + 1].index ?? 0;

    if (character >= start && character < end) {
      cellIdx = i;
      break;
    }
  }
  return cellIdx;
}

export function getIndent(text: string): string {
  const m = text.match(/^([ \t]*)/);
  return m ? m[1] : '';
}

export function calcColWidths(rows: string[][]): number[] {
  // Exclude separator rows ([ORG_TABLE_SEPARATOR]) from width calculation
  const dataRows = rows.filter(
    row => !(row.length === 1 && row[0] === ORG_TABLE_SEPARATOR)
  );

  const colCount = Math.max(...dataRows.map(r => r.length), 0);
  const colWidths = Array(colCount).fill(0);

  for (const row of dataRows) {
    for (let c = 0; c < colCount; c++) {
      colWidths[c] = Math.max(colWidths[c], getDisplayWidth(row[c] || ''));
    }
  }
  return colWidths;
}

export function isSeparatorLine(text: string): boolean {
  // Lines starting with "|-", or lines composed only of "|", "-", and "+"
  return /^\|[-+| ]*$/.test(text.trim()) && text.includes('-');
}

export function isTableLine(text: string): boolean {
  // Allow leading indentation (spaces or tabs), and consider a line as a table line if it starts with a '|'
  return /^[ \t]*\|.*/.test(text);
}

export function splitTableLineToCells(line: string): string[] {
  let cells = line.trim().split(/\s*\|\s*/);

  if (cells.length > 0 && cells[0] === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();

  return cells;
}

export function splitTableRows(tableLines: string[]): string[][] {
  return tableLines.map(line => {
    if (isSeparatorLine(line)) {
      // Separator lines are stored as arrays with a special flag
      return [ORG_TABLE_SEPARATOR];
    }
    // Treat empty cells as empty elements, but exclude leading/trailing empty elements
    return splitTableLineToCells(line);
  });
}

export function getDisplayWidth(str: string): number {
  let width = 0;

  for (const ch of str) {
    width +=
      /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF01-\uFF60\uFFE0-\uFFE6\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(
        ch
      )
        ? 2
        : 1;
  }
  return width;
}

export function formatSeparatorLine(
  colWidths: number[],
  indent: string = ''
): string {
  return indent + '|' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '|';
}

export function formatEmptyRow(
  colWidths: number[],
  indent: string = ''
): string {
  return indent + '| ' + colWidths.map(w => ' '.repeat(w)).join(' | ') + ' |';
}

export function formatTableRow(row: string[], colWidths: number[]): string {
  return (
    '| ' +
    colWidths
      .map((w, c) => {
        const cell = row[c] || '';
        const padLen = w - getDisplayWidth(cell);
        return cell + ' '.repeat(padLen);
      })
      .join(' | ') +
    ' |'
  );
}

// New utility function: getCellOffsetInRow
export function getCellOffsetInRow(rowText: string, cellIdx: number): number {
  const cellMatches = [...rowText.matchAll(/\|/g)];

  if (cellIdx < cellMatches.length - 1) {
    let offset = (cellMatches[cellIdx].index ?? 0) + 1;

    if (rowText[offset] === ' ') offset++;

    return offset;
  } else {
    // fallback: first cell or after last bar
    const idx = rowText.indexOf('| ');

    return idx !== -1
      ? idx + 2
      : (cellMatches[cellMatches.length - 1]?.index ?? 0) + 1;
  }
}

export function addColumnToTableRows(rows: string[][]): string[][] {
  return rows.map(row => {
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) {
      return [...row];
    } else {
      return [...row, ''];
    }
  });
}

// Remove a column (cellIdx) from all data rows (pure function)
export function removeColumnFromRows(
  rows: string[][],
  cellIdx: number
): string[][] {
  return rows.map(row => {
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) return [...row];
    const newRow = [...row];
    if (cellIdx >= 0 && cellIdx < newRow.length) {
      newRow.splice(cellIdx, 1);
    }
    return newRow;
  });
}

// Pad all data rows to the maximum number of columns (pure function)
export function padRowsToMaxCols(rows: string[][]): string[][] {
  const dataRows = rows.filter(
    r => !(r.length === 1 && r[0] === ORG_TABLE_SEPARATOR)
  );
  const maxCols =
    dataRows.length === 0 ? 0 : Math.max(...dataRows.map(r => r.length));
  return rows.map(row => {
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) return [...row];
    const newRow = [...row];
    while (newRow.length < maxCols) newRow.push('');
    return newRow;
  });
}

// Swap two columns (fromIdx, toIdx) across all data rows (pure function)
export function swapColumns(
  rows: string[][],
  fromIdx: number,
  toIdx: number
): string[][] {
  if (fromIdx === toIdx) return rows.map(r => [...r]);
  return rows.map(row => {
    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) return [...row];
    const newRow = [...row];
    if (
      fromIdx >= 0 &&
      toIdx >= 0 &&
      fromIdx < newRow.length &&
      toIdx < newRow.length
    ) {
      const tmp = newRow[fromIdx];
      newRow[fromIdx] = newRow[toIdx];
      newRow[toIdx] = tmp;
    }
    return newRow;
  });
}

export function getPrevCellPositionInfo(
  lines: string[],
  currentLine: number,
  charPos: number,
  startLine: number
): { line: number; offset: number } | null {
  const currentRowText = lines[currentLine];
  const cellIdx = getCellIndexAtPosition(currentRowText, charPos - 1);
  const cellMatches = [...currentRowText.matchAll(/\|/g)];

  if (cellIdx === 0 && currentLine > startLine) {
    let prevLine = currentLine - 1;

    // Skip separator lines
    while (prevLine >= startLine && isSeparatorLine(lines[prevLine])) {
      prevLine--;
    }

    if (prevLine >= startLine) {
      const prevRowText = lines[prevLine];
      const prevCellMatches = [...prevRowText.matchAll(/\|/g)];

      if (prevCellMatches.length >= 2) {
        const lastCellStart =
          prevCellMatches[prevCellMatches.length - 2].index ?? 0;
        let offset = lastCellStart + 1;

        if (prevRowText[offset] === ' ') offset++;
        return { line: prevLine, offset };
      }
    }
  } else if (cellIdx > 0) {
    const prevCellStart = cellMatches[cellIdx - 1].index ?? 0;
    let offset = prevCellStart + 1;

    if (currentRowText[offset] === ' ') offset++;
    return { line: currentLine, offset };
  }
  return null;
}

export function getNextCellPositionInfo(
  lines: string[],
  currentLine: number,
  charPos: number,
  startLine: number,
  endLine: number
): { line: number; offset: number } | null {
  const currentRowText = lines[currentLine];
  let cellIdx = getCellIndexAtPosition(currentRowText, charPos);
  const cellMatches = [...currentRowText.matchAll(/\|/g)];

  if (charPos === currentRowText.length && cellMatches.length >= 2) {
    cellIdx = cellMatches.length - 2;
  }

  if (cellIdx < cellMatches.length - 2) {
    const nextCellStart = cellMatches[cellIdx + 1].index ?? 0;
    let offset = nextCellStart + 1;

    if (currentRowText[offset] === ' ') offset++;
    return { line: currentLine, offset };
  } else if (currentLine < endLine) {
    const nextRowText = lines[currentLine + 1];

    if (isSeparatorLine(nextRowText) && currentLine + 2 <= endLine) {
      const afterSepText = lines[currentLine + 2];
      const firstCell = afterSepText.indexOf('| ');

      if (firstCell !== -1) {
        return { line: currentLine + 2, offset: firstCell + 2 };
      }
    } else {
      const firstCell = nextRowText.indexOf('| ');

      if (firstCell !== -1) {
        return { line: currentLine + 1, offset: firstCell + 2 };
      }
    }
  }
  return null;
}

export function getColWidthsFromTableLines(tableLines: string[]): number[] {
  const rows = splitTableRows(tableLines);
  const colWidths = calcColWidths(rows);
  // If the number of columns is 0, use 2 columns with width 3
  return colWidths.length === 0 ? [3, 3] : colWidths;
}

export function formatTableRowsWithIndents(
  rows: string[][],
  colWidths: number[],
  indents: string[]
): string[] {
  return rows.map((row, idx) => {
    const indent = indents[idx] || '';

    if (row.length === 1 && row[0] === ORG_TABLE_SEPARATOR) {
      return indent + formatSeparatorLine(colWidths);
    }
    return indent + formatTableRow(row, colWidths);
  });
}

export function detectTableRangeFromLines(
  lines: string[],
  line: number
): { startLine: number; endLine: number } {
  let startLine = line;
  let endLine = line;

  while (startLine > 0 && /^\s*\|.*\|\s*$/.test(lines[startLine - 1])) {
    startLine--;
  }

  while (
    endLine < lines.length - 1 &&
    /^\s*\|.*\|\s*$/.test(lines[endLine + 1])
  ) {
    endLine++;
  }
  return { startLine, endLine };
}
