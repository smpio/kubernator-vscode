import * as vscode from 'vscode';
import * as yaml from '../yaml';
import * as kube from '../kube';
import { ObjectNode, TreeDataProvider } from '../TreeDataProvider';

export async function deleteObjectFromActiveEditor(treeDataProvider: TreeDataProvider) {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = yaml.parse(text);

	await kube.api.delete(kube.api.getObjectUri(obj));
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

	if (typeof obj === 'object' && obj.metadata) {
		let parent = new ObjectNode(obj).getParent();
		treeDataProvider.invalidate(parent);
	}
}
