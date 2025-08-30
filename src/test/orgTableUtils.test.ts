import assert from 'node:assert';
import { ORG_TABLE_SEPARATOR } from '../constants';
import * as orgTableUtils from '../orgTableUtils';

suite('getCellIndexAtPosition', () => {
  test('returns correct cell index', () => {
    assert.strictEqual(orgTableUtils.getCellIndexAtPosition('test', 0), 0);

    assert.strictEqual(
      orgTableUtils.getCellIndexAtPosition('|test|test|', 0),
      0
    );

    assert.strictEqual(
      orgTableUtils.getCellIndexAtPosition('|test|test|', 6),
      1
    );
  });
});

suite('getIndent', () => {
  test('returns correct indent', () => {
    assert.strictEqual(orgTableUtils.getIndent(''), '');
    assert.strictEqual(orgTableUtils.getIndent('  '), '  ');
    assert.strictEqual(orgTableUtils.getIndent('  test'), '  ');
  });
});

suite('calcColWidths', () => {
  test('returns correct column widths', () => {
    assert.deepStrictEqual(
      orgTableUtils.calcColWidths([
        ['a', 'b'],
        ['c', 'd'],
      ]),
      [1, 1]
    );

    assert.deepStrictEqual(
      orgTableUtils.calcColWidths([['longer', 'short']]),
      [6, 5]
    );

    assert.deepStrictEqual(
      orgTableUtils.calcColWidths([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ]),
      [1, 1, 1]
    );
  });
});

suite('isSeparatorLine', () => {
  test('returns true for separator lines', () => {
    assert.strictEqual(orgTableUtils.isSeparatorLine('|---|---|'), true);
  });

  test('returns false for non-separator lines', () => {
    assert.strictEqual(orgTableUtils.isSeparatorLine('|a|b|'), false);
    assert.strictEqual(orgTableUtils.isSeparatorLine('|---|b|'), false);
  });
});

suite('isTableLine', () => {
  test('returns true for table lines', () => {
    assert.strictEqual(orgTableUtils.isTableLine('|---|---|'), true);
    assert.strictEqual(orgTableUtils.isTableLine('|   |   |'), true);
    assert.strictEqual(orgTableUtils.isTableLine('  |test|test|'), true);
  });

  test('returns false for non-table lines', () => {
    assert.strictEqual(orgTableUtils.isTableLine('a|b|'), false);
    assert.strictEqual(orgTableUtils.isTableLine('test'), false);
  });
});

suite('splitTableLineToCells', () => {
  test('splits table line into cells correctly', () => {
    assert.deepStrictEqual(orgTableUtils.splitTableLineToCells('|a|b|c|'), [
      'a',
      'b',
      'c',
    ]);

    assert.deepStrictEqual(
      orgTableUtils.splitTableLineToCells('|   |   |   |'),
      ['', '', '']
    );

    assert.deepStrictEqual(orgTableUtils.splitTableLineToCells('|a|b|c|   '), [
      'a',
      'b',
      'c',
    ]);
  });
});

suite('splitTableRows', () => {
  test('splits table rows into cells correctly', () => {
    assert.deepStrictEqual(orgTableUtils.splitTableRows(['|a|b|c|']), [
      ['a', 'b', 'c'],
    ]);

    assert.deepStrictEqual(orgTableUtils.splitTableRows(['|   |   |   |']), [
      ['', '', ''],
    ]);

    assert.deepStrictEqual(orgTableUtils.splitTableRows(['|a|b|c|   ']), [
      ['a', 'b', 'c'],
    ]);
  });

  test('separator lines are recognized', () => {
    assert.deepStrictEqual(orgTableUtils.splitTableRows(['|---|---|']), [
      [ORG_TABLE_SEPARATOR],
    ]);
  });
});

suite('getDisplayWidth', () => {
  test('calculates display width correctly', () => {
    assert.strictEqual(orgTableUtils.getDisplayWidth('a'), 1);
    assert.strictEqual(orgTableUtils.getDisplayWidth('あ'), 2);
    assert.strictEqual(orgTableUtils.getDisplayWidth('aあ'), 3);
  });
});

suite('formatSeparatorLine', () => {
  test('formats separator line correctly', () => {
    assert.strictEqual(
      orgTableUtils.formatSeparatorLine([1, 2, 3], '  '),
      '  |---+----+-----|'
    );
  });
});

suite('formatEmptyRow', () => {
  test('formats empty row correctly', () => {
    assert.strictEqual(
      orgTableUtils.formatEmptyRow([1, 2, 3], '  '),
      '  |   |    |     |'
    );
  });
});

suite('formatTableRow', () => {
  test('formats table row correctly', () => {
    assert.strictEqual(
      orgTableUtils.formatTableRow(['a', 'b', 'c'], [1, 1, 1]),
      '| a | b | c |'
    );
  });
});

suite('getCellOffsetInRow', () => {
  test('gets cell offset in row correctly', () => {
    assert.strictEqual(orgTableUtils.getCellOffsetInRow('| a | b |', 0), 2);
    assert.strictEqual(orgTableUtils.getCellOffsetInRow('| a | b |', 1), 6);
    assert.strictEqual(orgTableUtils.getCellOffsetInRow('| a | b |', 13), 2);
  });
});

suite('addColumnToTableRows', () => {
  test('adds a new column to all rows', () => {
    const input = [
      ['a', 'b'],
      ['c', 'd'],
    ];
    const expected = [
      ['a', 'b', ''],
      ['c', 'd', ''],
    ];
    assert.deepStrictEqual(orgTableUtils.addColumnToTableRows(input), expected);
  });

  test('handles empty rows', () => {
    const input = [[]];
    const expected = [['']];
    assert.deepStrictEqual(orgTableUtils.addColumnToTableRows(input), expected);
  });

  test('handles separator rows', () => {
    const input = [[ORG_TABLE_SEPARATOR]];
    const expected = [[ORG_TABLE_SEPARATOR]];
    assert.deepStrictEqual(orgTableUtils.addColumnToTableRows(input), expected);
  });
});

suite('removeColumnFromRows', () => {
  test('removes a column from all rows', () => {
    const input = [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ];
    const expected = [
      ['a', 'c'],
      ['d', 'f'],
    ];
    assert.deepStrictEqual(
      orgTableUtils.removeColumnFromRows(input, 1),
      expected
    );
  });

  test('handles empty rows', () => {
    const input = [[]];
    const expected = [[]];
    assert.deepStrictEqual(
      orgTableUtils.removeColumnFromRows(input, 0),
      expected
    );
  });

  test('handles separator rows', () => {
    const input = [[ORG_TABLE_SEPARATOR]];
    const expected = [[ORG_TABLE_SEPARATOR]];
    assert.deepStrictEqual(
      orgTableUtils.removeColumnFromRows(input, 0),
      expected
    );
  });
});

suite('padRowsToMaxCols', () => {
  test('pads rows to the maximum number of columns', () => {
    const input = [
      ['a', 'b'],
      ['c', 'd', 'e'],
    ];
    const expected = [
      ['a', 'b', ''],
      ['c', 'd', 'e'],
    ];
    assert.deepStrictEqual(orgTableUtils.padRowsToMaxCols(input), expected);
  });

  test('handles empty rows', () => {
    const input = [[]];
    const expected = [[]];
    assert.deepStrictEqual(orgTableUtils.padRowsToMaxCols(input), expected);
  });

  test('handles separator rows', () => {
    const input = [[ORG_TABLE_SEPARATOR]];
    const expected = [[ORG_TABLE_SEPARATOR]];
    assert.deepStrictEqual(orgTableUtils.padRowsToMaxCols(input), expected);
  });
});

suite('swapColumns', () => {
  test('swaps columns correctly', () => {
    const input = [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ];
    const expected = [
      ['c', 'b', 'a'],
      ['f', 'e', 'd'],
    ];
    assert.deepStrictEqual(orgTableUtils.swapColumns(input, 0, 2), expected);
  });

  test('handles empty rows', () => {
    const input = [[]];
    const expected = [[]];
    assert.deepStrictEqual(orgTableUtils.swapColumns(input, 0, 1), expected);
  });

  test('handles separator rows', () => {
    const input = [[ORG_TABLE_SEPARATOR]];
    const expected = [[ORG_TABLE_SEPARATOR]];
    assert.deepStrictEqual(orgTableUtils.swapColumns(input, 0, 1), expected);
  });
});

suite('getPrevCellPositionInfo', () => {
  test('gets previous cell position info correctly', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    const expected = { line: 1, offset: 2 };
    assert.deepStrictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 1, 5, 0),
      expected
    );
  });

  test('moves to previous cell in the same row', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at start of third cell in second row
    const expected = { line: 1, offset: 6 };
    assert.deepStrictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 1, 10, 0),
      expected
    );
  });

  test('moves to previous row if at first cell', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at start of first cell in second row
    const expected = { line: 0, offset: 10 };
    assert.deepStrictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 1, 2, 0),
      expected
    );
  });

  test('skips separator lines when moving to previous row', () => {
    const input = ['| a | b | c |', '|---+---+---|', '| d | e | f |'];
    // Cursor at start of first cell in third row
    const expected = { line: 0, offset: 10 };
    assert.deepStrictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 2, 2, 0),
      expected
    );
  });

  test('returns null if at first cell of first row', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at start of first cell in first row
    assert.strictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 0, 2, 0),
      null
    );
  });

  test('returns null if current cell index is 0 and currentLine == startLine', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at start of first cell in first row, startLine is 0
    assert.strictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 0, 2, 0),
      null
    );
  });

  test('moves to previous cell in the same row when charPos is at cell boundary', () => {
    const input = ['| a | b | c |'];
    // Cursor at start of third cell
    const expected = { line: 0, offset: 6 };
    assert.deepStrictEqual(
      orgTableUtils.getPrevCellPositionInfo(input, 0, 10, 0),
      expected
    );
  });
});

suite('getNextCellPositionInfo', () => {
  test('gets next cell position info correctly', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    const expected = { line: 0, offset: 10 };
    assert.deepStrictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, 5, 0, 1),
      expected
    );
  });

  test('moves to next cell in the same row', () => {
    const input = ['| a | b | c |'];
    // Cursor at start of first cell
    const expected = { line: 0, offset: 6 };
    assert.deepStrictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, 2, 0, 0),
      expected
    );
  });

  test('moves to next row if at last cell', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at end of first row (after last cell)
    const expected = { line: 1, offset: 2 };
    assert.deepStrictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, input[0].length, 0, 1),
      expected
    );
  });

  test('skips separator line when moving to next row', () => {
    const input = ['| a | b | c |', '|---+---+---|', '| d | e | f |'];
    // Cursor at end of first row (after last cell)
    const expected = { line: 2, offset: 2 };
    assert.deepStrictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, input[0].length, 0, 2),
      expected
    );
  });

  test('returns null if at last cell of last row', () => {
    const input = ['| a | b | c |', '| d | e | f |'];
    // Cursor at end of last row
    assert.strictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 1, input[1].length, 0, 1),
      null
    );
  });

  test('returns null if next row does not have a cell', () => {
    const input = ['| a | b | c |', 'not a table row'];
    // Cursor at end of first row
    assert.strictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, input[0].length, 0, 1),
      null
    );
  });

  test('moves to next cell in the same row when charPos is at cell boundary', () => {
    const input = ['| a | b | c |'];
    // Cursor at the start of second cell
    const expected = { line: 0, offset: 10 };
    assert.deepStrictEqual(
      orgTableUtils.getNextCellPositionInfo(input, 0, 6, 0, 0),
      expected
    );
  });
});

suite('getColWidthsFromTableLines', () => {
  test('calculates column widths correctly', () => {
    const input = ['| a | b | c |', '|---+---+---|', '| d | e | f |'];
    const expected = [1, 1, 1];
    assert.deepStrictEqual(
      orgTableUtils.getColWidthsFromTableLines(input),
      expected
    );
  });

  test('handles empty table', () => {
    const input: string[] = [];
    const expected = [3, 3];
    assert.deepStrictEqual(
      orgTableUtils.getColWidthsFromTableLines(input),
      expected
    );
  });

  test('handles table with varying column widths', () => {
    const input = [
      '| a | bb | ccc |',
      '|---+----+-----|',
      '| d | eee | ffff |',
    ];
    const expected = [1, 3, 4];
    assert.deepStrictEqual(
      orgTableUtils.getColWidthsFromTableLines(input),
      expected
    );
  });
});

suite('formatTableRowsWithIndents', () => {
  test('formats table rows with indents correctly', () => {
    const rows = [['a', 'b', 'c'], [ORG_TABLE_SEPARATOR], ['d', 'e', 'f']];
    const colWidths = [1, 1, 1];
    const indents = ['  ', '  ', '    '];
    const expected = [
      '  | a | b | c |',
      '  |---+---+---|',
      '    | d | e | f |',
    ];
    assert.deepStrictEqual(
      orgTableUtils.formatTableRowsWithIndents(rows, colWidths, indents),
      expected
    );
  });

  test('handles empty indents array', () => {
    const rows = [['a', 'b'], [ORG_TABLE_SEPARATOR], ['c', 'd']];
    const colWidths = [1, 1];
    const indents: string[] = [];
    const expected = ['| a | b |', '|---+---|', '| c | d |'];
    assert.deepStrictEqual(
      orgTableUtils.formatTableRowsWithIndents(rows, colWidths, indents),
      expected
    );
  });

  test('handles all separator rows', () => {
    const rows = [[ORG_TABLE_SEPARATOR], [ORG_TABLE_SEPARATOR]];
    const colWidths = [2, 2];
    const indents = [' ', '  '];
    const expected = [' |----+----|', '  |----+----|'];
    assert.deepStrictEqual(
      orgTableUtils.formatTableRowsWithIndents(rows, colWidths, indents),
      expected
    );
  });

  test('handles empty rows', () => {
    const rows: string[][] = [];
    const colWidths: number[] = [];
    const indents: string[] = [];
    const expected: string[] = [];
    assert.deepStrictEqual(
      orgTableUtils.formatTableRowsWithIndents(rows, colWidths, indents),
      expected
    );
  });

  test('handles rows with missing indents', () => {
    const rows = [
      ['a', 'b'],
      ['c', 'd'],
    ];
    const colWidths = [1, 1];
    const indents = ['  '];
    const expected = ['  | a | b |', '| c | d |'];
    assert.deepStrictEqual(
      orgTableUtils.formatTableRowsWithIndents(rows, colWidths, indents),
      expected
    );
  });
});

suite('detectTableRangeFromLines', () => {
  test('detects table range for a single table line', () => {
    const lines = ['not a table', '| a | b | c |', 'not a table'];
    const expected = { startLine: 1, endLine: 1 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 1),
      expected
    );
  });

  test('detects table range for multiple consecutive table lines', () => {
    const lines = [
      'not a table',
      '| a | b | c |',
      '| d | e | f |',
      '| g | h | i |',
      'not a table',
    ];
    const expected = { startLine: 1, endLine: 3 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 2),
      expected
    );
  });

  test('detects table range when cursor is at the first line of the table', () => {
    const lines = [
      'not a table',
      '| a | b | c |',
      '| d | e | f |',
      'not a table',
    ];
    const expected = { startLine: 1, endLine: 2 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 1),
      expected
    );
  });

  test('detects table range when cursor is at the last line of the table', () => {
    const lines = [
      'not a table',
      '| a | b | c |',
      '| d | e | f |',
      'not a table',
    ];
    const expected = { startLine: 1, endLine: 2 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 2),
      expected
    );
  });

  test('handles table at the start of the document', () => {
    const lines = ['| a | b | c |', '| d | e | f |', 'not a table'];
    const expected = { startLine: 0, endLine: 1 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 0),
      expected
    );
  });

  test('handles table at the end of the document', () => {
    const lines = ['not a table', '| a | b | c |', '| d | e | f |'];
    const expected = { startLine: 1, endLine: 2 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 2),
      expected
    );
  });

  test('handles table with indented lines', () => {
    const lines = ['  | a | b | c |', '  | d | e | f |', 'not a table'];
    const expected = { startLine: 0, endLine: 1 };
    assert.deepStrictEqual(
      orgTableUtils.detectTableRangeFromLines(lines, 0),
      expected
    );
  });

  test('handles empty lines between tables', () => {
    const lines = ['| a | b |', '', '| c | d |'];
    assert.deepStrictEqual(orgTableUtils.detectTableRangeFromLines(lines, 0), {
      startLine: 0,
      endLine: 0,
    });
    assert.deepStrictEqual(orgTableUtils.detectTableRangeFromLines(lines, 2), {
      startLine: 2,
      endLine: 2,
    });
  });
});
