import * as vscode from 'vscode';
import * as yaml from '../yaml';
import * as kube from '../kube';
import { deepEqual } from '../util';
import { Definition } from '../kube/interfaces';

const DROP = Symbol('DROP');

export async function cleanObjectInActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = yaml.parse(text);

	if (typeof obj !== 'object') {
		return;
	}

	let resource = kube.api.getResource(obj.apiVersion, obj.kind);

	if (!resource.definition) {
		vscode.window.showInformationMessage(`No definition for ${obj.apiVersion} ${obj.kind}`);
		return;
	}

	cleanYamlRecursive(obj, resource.definition);

	text = yaml.stringify(obj);

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

function cleanYamlRecursive(yaml: any, def: Definition) {
	if (def.type === 'ref') {
		let typeRef = def.$ref;

		if (typeRef === 'io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta') {
			if (yaml.labels) {
				cleanLabels(yaml.labels);
			}
			if (yaml.annotations) {
				cleanAnnotations(yaml.annotations);
			}
		}

		if (typeRef === 'io.k8s.apimachinery.pkg.apis.meta.v1.LabelSelector' && yaml.matchLabels) {
			cleanLabels(yaml.matchLabels);
		}

		def = kube.api.definitions[def.$ref];
		if (!def) {
			return;
		}
	}

	if (def.type !== 'object') {
		return;
	}

	if ('default' in def && deepEqual(yaml, def.default)) {
		return DROP;
	}

	for (let [k, v] of Object.entries(yaml)) {
		let subdef = def.properties?.[k];
		if (!subdef) {
			continue;
		}

		if (subdef.readOnly) {
			delete yaml[k];
			continue;
		}

		if ('default' in subdef) {
			if (typeof subdef.default === 'object') {
				if (deepEqual(v, subdef.default)) {
					delete yaml[k];
					continue;
				}
			}
			else if (v === subdef.default) {
				delete yaml[k];
				continue;
			}
		}

		if (v instanceof Array && subdef.type === 'array') {
			for (let item of v) {
				cleanYamlRecursive(item, subdef.items);
			}
		} else if (typeof v === 'object' && v) {
			if (cleanYamlRecursive(v, subdef) === DROP) {
				delete yaml[k];
			}
		}
	}

	if (Object.entries(yaml).length === 0) {
		return DROP;
	}
}

function cleanLabels(labels: any) {
	delete labels['controller-uid'];
	delete labels['job-name'];
	delete labels['pod-template-hash'];
}

function cleanAnnotations(ann: any) {
	delete ann['cni.projectcalico.org/containerID'];
	delete ann['cni.projectcalico.org/podIP'];
	delete ann['cni.projectcalico.org/podIPs'];
	delete ann['kubernetes.io/psp'];
}
