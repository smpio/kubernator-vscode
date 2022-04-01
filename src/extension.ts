import * as vscode from 'vscode';
import * as kube from './kube';
import { startProxy, Proxy, getContexts, getDefaultContext } from './kube/proxy';
import { TreeDataProvider, Node, ObjectNode } from './TreeDataProvider';
import { FSProvider } from './FSProvider';
import { createObjectFromActiveEditor } from './commands/create';
import { cleanObjectInActiveEditor } from './commands/clean';
import { deleteObjectFromActiveEditor } from './commands/delete';
import { revealObjectInActiveEditor } from './commands/reveal';
import { startShell } from './commands/shell';

const switchContextCommandId = 'kubernator.switchContext';

export async function activate(context: vscode.ExtensionContext) {
	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	let treeDataProvider = new TreeDataProvider();
	let proxy: Proxy|null = null;

	let d = context.subscriptions.push.bind(context.subscriptions);

	d(statusBarItem);
	statusBarItem.command = switchContextCommandId;
	statusBarItem.text = 'Kubernating...';
	statusBarItem.show();

	async function reconfigure(ctx?: string) {
		let config = vscode.workspace.getConfiguration('kubernator');

		if (!ctx && config.apiURL) {
			kube.api.configure({apiURL: config.apiURL});
			statusBarItem.text = config.apiURL;
		} else {
			if (proxy && ctx && proxy.context !== ctx) {
				proxy.dispose();
				proxy = null;
			}

			if (!ctx) {
				if (proxy) {
					ctx = proxy.context;
				} else {
					ctx = await getDefaultContext();
				}
			}

			if (!proxy) {
				proxy = await startProxy(ctx);
				d(proxy);
			}

			kube.api.configure({socketPath: proxy.socketPath});
			statusBarItem.text = ctx;
		}

		treeDataProvider.invalidate();
	}

	await reconfigure();

	d(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('kubernator')) {
			reconfigure(proxy?.context);
		}
	}));

	d(vscode.commands.registerCommand('kubernator.reconfigure', reconfigure));

	d(vscode.commands.registerCommand('kubernator.refresh', (node?: Node) => {
		treeDataProvider.invalidate(node);
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
			treeDataProvider.invalidate(node.getParent());
		} else {
			deleteObjectFromActiveEditor();
		}
	})));

	d(vscode.commands.registerCommand('kubernator.create', handleCommandErrors(createObjectFromActiveEditor)));
	d(vscode.commands.registerCommand('kubernator.clean', handleCommandErrors(cleanObjectInActiveEditor)));

	d(vscode.commands.registerCommand('kubernator.gotoPV', handleCommandErrors(async (node: ObjectNode) => {
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

	d(vscode.commands.registerCommand(switchContextCommandId, handleCommandErrors(async () => {
		let config = vscode.workspace.getConfiguration('kubernator');

		let items: ContextPickItem[] = (await getContexts()).map(ctx => ({
			label: ctx,
		}));
		if (config.apiURL) {
			items.push({
				label: config.apiURL,
				isApiURL: true,
				description: 'Use API URL',
			});
		}
		let quickPick = vscode.window.createQuickPick<ContextPickItem>();
		quickPick.items = items;
		quickPick.onDidChangeSelection(handleCommandErrors(async selection => {
			if (!selection[0]) {
				return;
			}

			let ctx = selection[0].label;
			if (selection[0].isApiURL) {
				ctx = undefined;
			}

			await reconfigure(ctx);
			quickPick.hide();
		}));
		quickPick.onDidHide(() => quickPick.dispose());
		quickPick.show();
	})));
}

export function deactivate() {
}

function handleCommandErrors<F extends (...a: any) => any>(fn: F): (...a: Parameters<F>) => Promise<ReturnType<F>> {
	return async function (this: any, ...a: Parameters<F>) {
		try {
			let ret = await Promise.resolve(fn.apply(this, a));
			return ret;
		} catch (err: any) {
			vscode.window.showErrorMessage(err.message);
		}
	};
}

interface ContextPickItem extends vscode.QuickPickItem {
	isApiURL?: boolean;
}
