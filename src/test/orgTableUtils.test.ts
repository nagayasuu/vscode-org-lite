import assert from 'node:assert';
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
