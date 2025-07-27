import * as os from 'os';
import * as vscode from 'vscode';

let agendaContent = '';
let agendaEmitter: vscode.EventEmitter<vscode.Uri> | undefined;

export async function showAgendaView() {
  // Search for Org files
  const orgFiles = await vscode.workspace.findFiles('**/*.org');

  // Parse tasks and schedules, group by file
  const agendaItems: string[] = [];
  for (const file of orgFiles) {
    const document = await vscode.workspace.openTextDocument(file);
    const lines = document.getText().split('\n');
    const fileItems: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/TODO/)) {
        // Output with line number
        fileItems.push(`  ${i + 1}: ${line.trim()}`);
      }
    }
    if (fileItems.length > 0) {
      agendaItems.push(`${vscode.workspace.asRelativePath(file)}:`);
      agendaItems.push(...fileItems);
      // Separator between files
      agendaItems.push('');
    }
  }
  agendaContent = agendaItems.join(os.EOL);

  // Register provider on first use
  const uri = vscode.Uri.parse('org-agenda:AgendaView.code-search');
  if (!agendaEmitter) {
    agendaEmitter = new vscode.EventEmitter<vscode.Uri>();
    vscode.workspace.registerTextDocumentContentProvider('org-agenda', {
      provideTextDocumentContent: () => agendaContent,
      onDidChange: agendaEmitter.event,
    });
  }

  // Fire content change event to reload
  agendaEmitter.fire(uri);

  // Show virtual document
  await vscode.window.showTextDocument(uri, { preview: false });
}
