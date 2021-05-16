import * as vscode from 'vscode';
import * as yaml from '../yaml';
import * as kube from '../kube';

export async function deleteObjectFromActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = yaml.parse(text);

	await kube.api.delete(kube.api.getObjectUri(obj));
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
