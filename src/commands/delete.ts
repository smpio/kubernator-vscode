import * as vscode from 'vscode';
import * as kube from '../kube';

export async function deleteObjectFromActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = kube.yaml.parse(text);

	await kube.api.delete(kube.api.getObjectUri(obj));
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
