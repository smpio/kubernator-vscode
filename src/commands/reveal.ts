import * as vscode from 'vscode';
import * as kube from '../kube';
import { Node, ObjectNode } from '../TreeDataProvider';

export function revealObjectInActiveEditor(treeView: vscode.TreeView<Node>) {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = kube.yaml.parse(text);

	if (typeof obj !== 'object') {
		return;
	}

  if (!obj.metadata) {
    throw Error('No object metadata');
  }

  treeView.reveal(new ObjectNode(obj), {
		focus: true,
	});
}
