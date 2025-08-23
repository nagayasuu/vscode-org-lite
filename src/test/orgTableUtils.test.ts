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
