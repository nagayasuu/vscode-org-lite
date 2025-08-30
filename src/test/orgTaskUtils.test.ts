import * as assert from 'assert';
import { isHeadingLine, replaceTaskState } from '../orgTaskUtils';

suite('isHeadingLine', () => {
  test('identifies heading lines', () => {
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
});

suite('replaceTaskState', () => {
  test('not heading text', () => {
    const input = 'This is a normal line';
    const result = replaceTaskState(input, false);

    assert.strictEqual(
      result,
      input,
      'Non-heading lines should not be modified'
    );
  });

  test('reverse is false', () => {
    const cases = [
      { input: '* TODO Heading 1', expected: '* DONE Heading 1' },
      { input: '* DONE Heading 1', expected: '* Heading 1' },
      { input: '* Heading 1', expected: '* TODO Heading 1' },
      { input: '  * TODO Heading 2', expected: '  * DONE Heading 2' },
      { input: '  * DONE Heading 2', expected: '  * Heading 2' },
      { input: '  * Heading 2', expected: '  * TODO Heading 2' },
    ];

    for (const { input, expected } of cases) {
      assert.strictEqual(replaceTaskState(input, false), expected);
    }
  });

  test('reverse is true', () => {
    const cases = [
      { input: '* TODO Heading 1', expected: '* Heading 1' },
      { input: '* DONE Heading 1', expected: '* TODO Heading 1' },
      { input: '* Heading 1', expected: '* DONE Heading 1' },
      { input: '  * TODO Heading 2', expected: '  * Heading 2' },
      { input: '  * DONE Heading 2', expected: '  * TODO Heading 2' },
      { input: '  * Heading 2', expected: '  * DONE Heading 2' },
    ];

    for (const { input, expected } of cases) {
      assert.strictEqual(replaceTaskState(input, true), expected);
    }
  });
});
