import * as vscode from 'vscode';
import * as kube from '../kube';
import { objectUri, closeActiveEditor } from '../util';

export async function createObjectFromActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = kube.yaml.parse(text);

	if (!obj.apiVersion) {
		throw new Error('Invalid YAML: apiVersion not specified');
	}

	if (!obj.kind) {
		throw new Error('Invalid YAML: kind not specified');
	}

	let resource = kube.api.getResource(obj.apiVersion, obj.kind);
	let postUri = kube.api.getResourceUri(resource, obj.metadata?.namespace);

	obj = await kube.api.post(postUri, JSON.stringify(obj), 'application/json').then(r => r.json());

	closeActiveEditor();
	vscode.window.showTextDocument(objectUri(obj), { preview: false });
}
