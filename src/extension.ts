import * as vscode from 'vscode';
import * as kube from './kube';
import { TreeDataProvider, Node } from './TreeDataProvider';
import { ContentProvider } from './ContentProvider';

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

	let provider = new ContentProvider();
	d(vscode.workspace.registerTextDocumentContentProvider(ContentProvider.scheme, provider));
}

export function deactivate() {
}
