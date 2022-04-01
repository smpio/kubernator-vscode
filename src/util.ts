import * as vscode from 'vscode';
import * as interfaces from './interfaces';
import * as kube from './kube';
import * as assert from 'assert';

const CACHE_PROP = Symbol('ttlCache');

export function ttlCache(ttlMs: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    let method = descriptor.value!;

    descriptor.value = function cached () {
      let cacheStore = (this as any)[CACHE_PROP];
      if (!cacheStore) {
        cacheStore = (this as any)[CACHE_PROP] = {};
      }
      let cache = cacheStore[CACHE_PROP];

      if (!cache || Date.now() - cache.time > ttlMs) {
        cache = cacheStore[CACHE_PROP] = {
          value: method.apply(this, arguments),
          time: Date.now(),
        };
      }
      return cache.value;
    };
  };
}

export function objectUri(obj: kube.Object) {
  let path = kube.api.getObjectUri(obj);
  return vscode.Uri.parse(`${interfaces.DOCUMENT_SCHEME}:/${path}.yaml`);
}

export function deepEqual(obj1: any, obj2: any) {
  try {
    assert.deepStrictEqual(obj1, obj2);
    return true;
  } catch (err) {
    return false;
  }
}

export function closeActiveEditor() {
  let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	if (editor.document.isUntitled) {
		let all = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(editor.document.lineCount, 0));
		editor.edit(editBuilder => {
			editBuilder.replace(all, '');
		});
	}

	vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
