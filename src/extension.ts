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
			kube.api.configure(config.apiURL); // TODO: check config is updated
			treeDataProvider.reset();
		}
	}));

	d(vscode.commands.registerCommand('kubernator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Kubernator!');
	}));

  d(vscode.window.registerTreeDataProvider('kubernator.treeView', treeDataProvider));
}

export function deactivate() {
}
