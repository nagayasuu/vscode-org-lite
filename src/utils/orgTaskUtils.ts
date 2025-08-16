import { HEADING_REGEX, TASK_STATE } from '../constants';

export function isHeadingLine(lineText: string): boolean {
  return HEADING_REGEX.test(lineText);
}

export function replaceTaskState(lineText: string, reverse: boolean): string {
  const match = lineText.match(HEADING_REGEX);
  if (!match) return lineText;
  const [, indent, stars, content] = match;

  let newLineText = '';

  if (reverse) {
    if (content.startsWith(TASK_STATE.DONE)) {
      newLineText = `${indent}${stars} ${TASK_STATE.TODO}${content.slice(TASK_STATE.DONE.length)}`;
    } else if (content.startsWith(TASK_STATE.TODO)) {
      newLineText = `${indent}${stars} ${content.slice(TASK_STATE.TODO.length)}`;
    } else {
      newLineText = `${indent}${stars} ${TASK_STATE.DONE}${content}`;
    }
  } else {
    if (content.startsWith(TASK_STATE.TODO)) {
      newLineText = `${indent}${stars} ${TASK_STATE.DONE}${content.slice(TASK_STATE.TODO.length)}`;
    } else if (content.startsWith(TASK_STATE.DONE)) {
      newLineText = `${indent}${stars} ${content.slice(TASK_STATE.DONE.length)}`;
    } else {
      newLineText = `${indent}${stars} ${TASK_STATE.TODO}${content}`;
    }
  }

  return newLineText;
}
