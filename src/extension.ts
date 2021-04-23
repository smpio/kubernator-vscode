import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kubernator" is now active!');

	const d = context.subscriptions.push.bind(context.subscriptions);

	d(vscode.commands.registerCommand('kubernator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Kubernator!');
	}));

  d(vscode.window.registerTreeDataProvider('kubernator', new TreeDataProvider()));
}

export function deactivate() {
}
