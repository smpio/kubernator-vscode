import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "kubernator" is now active!');

	let disposable = vscode.commands.registerCommand('kubernator.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Kubernator!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
}
