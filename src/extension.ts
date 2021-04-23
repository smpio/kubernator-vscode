import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	const d = context.subscriptions.push.bind(context.subscriptions);

	d(vscode.commands.registerCommand('kubernator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Kubernator!');
	}));

  d(vscode.window.registerTreeDataProvider('kubernator.treeView', new TreeDataProvider()));
}

export function deactivate() {
}
