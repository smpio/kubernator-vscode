import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';
import * as kube from './kube';

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

	d(vscode.commands.registerCommand('kubernator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Kubernator!');
	}));

  d(vscode.window.registerTreeDataProvider('kubernator.treeView', treeDataProvider));

	let treeView = vscode.window.createTreeView('kubernator.treeView', {
		treeDataProvider: treeDataProvider,
	});

	d(treeView);
	treeView.onDidExpandElement(e => treeDataProvider.invalidate(e.element)); // invalidate subtree cache on expand
}

export function deactivate() {
}
