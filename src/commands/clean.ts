import * as vscode from 'vscode';
import * as kube from '../kube';


export async function cleanObjectInActiveEditor() {
	let config = vscode.workspace.getConfiguration('kubernator');
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

	kube.cleanObject(obj, kube.api);

	text = kube.yaml.stringify(obj, {
		decodeSecrets: config.decodeSecrets
	});

	if (document.isUntitled) {
		let all = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0));
		editor.edit(editBuilder => {
			editBuilder.replace(all, text);
		});
	} else {
		document = await vscode.workspace.openTextDocument({
			content: text,
			language: document.languageId,
		});
		vscode.window.showTextDocument(document);
	}
}
