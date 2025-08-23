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
