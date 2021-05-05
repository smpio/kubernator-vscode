import * as vscode from 'vscode';
import * as YAML from 'yaml';
import * as kube from './kube';
import { TreeDataProvider, Node, ObjectNode } from './TreeDataProvider';
import { FSProvider } from './FSProvider';

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
	let uri = kube.api.getResourceUri(resource, obj.metadata?.namespace);

	obj = await kube.api.post(uri, JSON.stringify(obj));

	// TODO: replace tab with 'kube:... file'
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
