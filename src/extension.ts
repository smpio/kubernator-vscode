import * as vscode from 'vscode';
import * as YAML from 'yaml';
import * as kube from './kube';
import { TreeDataProvider, Node, ObjectNode } from './TreeDataProvider';
import { FSProvider } from './FSProvider';
import { objectUri } from './util';
import { Definition } from './kube/interfaces';

export function activate(context: vscode.ExtensionContext) {
	let d = context.subscriptions.push.bind(context.subscriptions);

	let config = vscode.workspace.getConfiguration('kubernator');
	kube.api.configure(config.apiURL);

	let treeDataProvider = new TreeDataProvider();

	d(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('kubernator')) {
			config = vscode.workspace.getConfiguration('kubernator');
			kube.api.configure(config.apiURL);
			treeDataProvider.invalidate();
		}
	}));

	d(vscode.commands.registerCommand('kubernator.refresh', (node?: Node) => {
		treeDataProvider.invalidate(node);
	}));

	let treeView = vscode.window.createTreeView('kubernator.treeView', {
		treeDataProvider: treeDataProvider,
	});

	d(treeView);
	treeView.onDidExpandElement(e => treeDataProvider.invalidate(e.element)); // invalidate subtree cache on expand

	let fsProvider = new FSProvider();
	d(vscode.workspace.registerFileSystemProvider(FSProvider.scheme, fsProvider, {
		isCaseSensitive: true,
	}));

	// TODO: can be called without argument (using command palette)
	d(vscode.commands.registerCommand('kubernator.delete', async (node: ObjectNode) => {
		await fsProvider.delete(node.resourceUri, {recursive: false});
		treeDataProvider.invalidate(node.parent);
	}));

	d(vscode.commands.registerCommand('kubernator.create', handleCommandErrors(createObjectFromActiveEditor)));
	d(vscode.commands.registerCommand('kubernator.clean', handleCommandErrors(cleanObjectInActiveEditor)));
}

export function deactivate() {
}

async function createObjectFromActiveEditor() {
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

	// vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	vscode.commands.executeCommand('vscode.open', objectUri(obj));
	// vscode.window.showTextDocument(objectUri(obj), { preview: false });
}

async function cleanObjectInActiveEditor() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	let document = editor.document;
	let text = document.getText();
	let obj = YAML.parse(text);

	if (typeof obj !== 'object') {
		return;
	}

	let resource = kube.api.getResource(obj.apiVersion, obj.kind);

	if (!resource.definition) {
		vscode.window.showInformationMessage(`No definition for ${obj.apiVersion} ${obj.kind}`);
		return;
	}

	cleanYamlRecursive(obj, resource.definition);

	text = YAML.stringify(obj, {
		indentSeq: false,
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

function cleanYamlRecursive(yaml: any, def: Definition) {
	if (def.type === 'ref') {
		def = kube.api.definitions[def.$ref];
		if (!def) {
			return;
		}
	}

	if (def.type !== 'object') {
		return;
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

		if ('default' in subdef && v === subdef.default) {
			delete yaml[k];
			continue;
		}

		if (v instanceof Array && subdef.type === 'array') {
			for (let item of v) {
				cleanYamlRecursive(item, subdef.items);
			}
		} else if (typeof v === 'object' && v) {
			cleanYamlRecursive(v, subdef);
		}
	}
}

function handleCommandErrors<F extends (...a: any) => any>(fn: F): (...a: Parameters<F>) => Promise<ReturnType<F>> {
	return async function (this: any, ...a: Parameters<F>) {
		try {
			let ret = await Promise.resolve(fn.apply(this, a));
			return ret;
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	};
}
