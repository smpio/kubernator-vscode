import * as vscode from 'vscode';
import * as YAML from 'yaml';
import * as kube from '../kube';
import { objectUri } from '../util';

export async function createObjectFromActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = YAML.parse(text);

	if (!obj.apiVersion) {
		throw new Error('Invalid YAML: apiVersion not specified');
	}

	if (!obj.kind) {
		throw new Error('Invalid YAML: kind not specified');
	}

	let resource = kube.api.getResource(obj.apiVersion, obj.kind);
	let postUri = kube.api.getResourceUri(resource, obj.metadata?.namespace);

	obj = await kube.api.post(postUri, text, 'application/yaml').then(r => r.json());

	vscode.commands.executeCommand('vscode.open', objectUri(obj));
	// vscode.window.showTextDocument(objectUri(obj), { preview: false });
}
