import * as vscode from 'vscode';
import * as YAML from 'yaml';
import * as kube from '../kube';

export async function deleteObjectFromActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = YAML.parse(text);

  let uri = obj?.metadata?.selfLink;
	if (!uri) {
		throw new Error('Invalid YAML: no selfLink');
	}

	await kube.api.delete(uri);
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
