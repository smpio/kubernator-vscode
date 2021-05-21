import * as vscode from 'vscode';
import * as kube from './kube';
import { startProxy, Proxy } from './kube/proxy';
import { TreeDataProvider, Node, ObjectNode } from './TreeDataProvider';
import { FSProvider } from './FSProvider';
import { createObjectFromActiveEditor } from './commands/create';
import { cleanObjectInActiveEditor } from './commands/clean';
import { deleteObjectFromActiveEditor } from './commands/delete';
import { revealObjectInActiveEditor } from './commands/reveal';
import { startShell } from './commands/shell';
import { waitObjectDeleted } from './util';

export async function activate(context: vscode.ExtensionContext) {
	let d = context.subscriptions.push.bind(context.subscriptions);
	let proxy: Proxy|null = null;

	let treeDataProvider = new TreeDataProvider();

	async function reconfigure() {
		let config = vscode.workspace.getConfiguration('kubernator');

		if (config.apiURL) {
			kube.api.configure({apiURL: config.apiURL});
		} else {
			if (!proxy) {
				proxy = await startProxy();
				d(proxy);
			}
			kube.api.configure({socketPath: proxy.socketPath});
		}

		treeDataProvider.invalidate();
	}

	await reconfigure();

	d(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('kubernator')) {
			reconfigure();
		}
	}));

	d(vscode.commands.registerCommand('kubernator.reconfigure', reconfigure));

	d(vscode.commands.registerCommand('kubernator.refresh', (node?: Node) => {
		if (node) {
			let clone = node.clone();
			treeDataProvider.invalidate(clone);
		} else {
			treeDataProvider.invalidate(node);
		}
	}));

	let treeView = vscode.window.createTreeView('kubernator.treeView', {
		treeDataProvider: treeDataProvider,
		showCollapseAll: true,
	});

	d(treeView);

	// Workaround for TreeView content caching
	// By default, once tree view item has been expanded, its children are saved in cache that is not cleared
	// after collapsing the item.
	// Another approach would be calling invalidate immediately after expand, but this will lead to
	// race conditions. See 06f58be for details.
	let expandedElements = new Set<string>();
	treeView.onDidExpandElement(e => {
		let element = e.element;
		if (!element.id) {
			return;
		}

		if (expandedElements.has(element.id)) {
			setTimeout(() => {
				treeDataProvider.invalidate(element);
			}, 1000);
		} else {
			expandedElements.add(element.id);
		}
	});

	let fsProvider = new FSProvider();
	d(vscode.workspace.registerFileSystemProvider(FSProvider.scheme, fsProvider, {
		isCaseSensitive: true,
	}));

	d(vscode.commands.registerCommand('kubernator.delete', handleCommandErrors(async (node?: ObjectNode) => {
		if (node) {
			await fsProvider.delete(node.resourceUri, {recursive: false});
			if (await waitObjectDeleted(node.obj)) {
				let parent = node.getParent();
				treeDataProvider.invalidate(parent);
			}
		} else {
			deleteObjectFromActiveEditor(treeDataProvider);
		}
	})));

	d(vscode.commands.registerCommand('kubernator.create', handleCommandErrors(createObjectFromActiveEditor)));
	d(vscode.commands.registerCommand('kubernator.clean', handleCommandErrors(cleanObjectInActiveEditor)));

	d(vscode.commands.registerCommand('kubernator.goto_pv', handleCommandErrors(async (node: ObjectNode) => {
		let obj = node.obj as any;
		let pvName = obj.spec.volumeName;
		if (!pvName) {
			throw new Error('volumeName not set');
		}

		treeView.reveal(new ObjectNode({
			apiVersion: 'v1',
			kind: 'PersistentVolume',
			metadata: {
				name: pvName,
			},
		}), {
			focus: true,
		});
	})));

	d(vscode.commands.registerCommand('kubernator.reveal', handleCommandErrors(() => revealObjectInActiveEditor(treeView))));

	d(vscode.commands.registerCommand('kubernator.edit', handleCommandErrors(
		(node: ObjectNode) => vscode.commands.executeCommand('vscode.open', node.resourceUri))));

	d(vscode.commands.registerCommand('kubernator.shell', handleCommandErrors(startShell)));
}

export function deactivate() {
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
