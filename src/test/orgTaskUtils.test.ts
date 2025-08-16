import * as assert from 'assert';
import { isHeadingLine, replaceTaskState } from '../orgTaskUtils';

test('isHeadingLine', () => {
  const cases = [
    { input: '* Heading 1', expected: true },
    { input: '  * Heading 2', expected: true },
    { input: 'Normal text', expected: false },
    { input: '', expected: false },
  ];

  for (const { input, expected } of cases) {
    assert.strictEqual(isHeadingLine(input), expected);
  }
});

suite('replaceTaskState', () => {
  test('reverse is false', () => {
    const cases = [
      { input: '* TODO test', expected: '* DONE test' },
      { input: '* DONE test', expected: '* test' },
      { input: '* test', expected: '* TODO test' },
    ];

    for (const { input, expected } of cases) {
      assert.strictEqual(replaceTaskState(input, false), expected);
    }
  });

  test('reverse is true', () => {
    const cases = [
      { input: '* TODO test', expected: '* test' },
      { input: '* DONE test', expected: '* TODO test' },
      { input: '* test', expected: '* DONE test' },
    ];

    for (const { input, expected } of cases) {
      assert.strictEqual(replaceTaskState(input, true), expected);
    }
  });
});
