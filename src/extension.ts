import * as vscode from 'vscode';
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

	d(vscode.commands.registerCommand('kubernator.delete', async (node: ObjectNode) => {
		await fsProvider.delete(node.resourceUri, {recursive: false});
		treeDataProvider.invalidate(node.parent);
	}));
}

export function deactivate() {
}
