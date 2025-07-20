// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "org-lite" is now active!');

	// Helper function to rotate TODO states
	function rotateTodoState(reverse: boolean = false) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		// Check if current file is .org file
		if (editor.document.languageId !== 'org') {
			vscode.window.showWarningMessage('This command is only available in Org files');
			return;
		}

		const position = editor.selection.active;
		const line = editor.document.lineAt(position.line);
		const lineText = line.text;

		// Check if current line is a heading (starts with *)
		const headingMatch = lineText.match(/^(\*+)\s+(.*)$/);
		if (!headingMatch) {
			vscode.window.showInformationMessage('Cursor must be on a heading line');
			return;
		}

		const stars = headingMatch[1];
		const content = headingMatch[2];

		let newLineText: string;

		if (reverse) {
			// Reverse direction: DONE → TODO → (unmarked)
			if (content.startsWith('DONE ')) {
				// DONE → TODO
				newLineText = `${stars} TODO ${content.substring(5)}`;
			} else if (content.startsWith('TODO ')) {
				// TODO → (unmarked)
				newLineText = `${stars} ${content.substring(5)}`;
			} else {
				// (unmarked) → DONE
				newLineText = `${stars} DONE ${content}`;
			}
		} else {
			// Forward direction: (unmarked) → TODO → DONE
			if (content.startsWith('TODO ')) {
				// TODO → DONE
				newLineText = `${stars} DONE ${content.substring(5)}`;
			} else if (content.startsWith('DONE ')) {
				// DONE → (unmarked)
				newLineText = `${stars} ${content.substring(5)}`;
			} else {
				// (unmarked) → TODO
				newLineText = `${stars} TODO ${content}`;
			}
		}

		// Replace text
		const range = new vscode.Range(
			position.line, 0,
			position.line, lineText.length
		);

		editor.edit(editBuilder => {
			editBuilder.replace(range, newLineText);
		});
	}

	// Rotate TODO command (forward)
	const rotateTodoDisposable = vscode.commands.registerCommand('org-lite.rotateTodo', () => {
		rotateTodoState(false);
	});

	// Rotate TODO command (reverse)
	const rotateTodoReverseDisposable = vscode.commands.registerCommand('org-lite.rotateTodoReverse', () => {
		rotateTodoState(true);
	});

	context.subscriptions.push(rotateTodoDisposable);
	context.subscriptions.push(rotateTodoReverseDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
