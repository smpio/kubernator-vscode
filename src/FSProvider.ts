import * as nodePath from 'path';
import * as vscode from 'vscode';
import * as kube from './kube';
import * as interfaces from './interfaces';

const EXT_MIMETYPE_MAP: {[ext: string]: string} = {
  '.yaml': 'application/yaml',  // eslint-disable-line @typescript-eslint/naming-convention
  '.json': 'application/json',  // eslint-disable-line @typescript-eslint/naming-convention
};

// TODO: add fetch cache for sequence "stat, read"
export class FSProvider implements vscode.FileSystemProvider {
	static scheme = interfaces.DOCUMENT_SCHEME;

  private forceReloadFiles = new Set();

  private onDidChangeFileEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    if (this.forceReloadFiles.delete(uri.path)) {
      setTimeout(() => {
        this.onDidChangeFileEmitter.fire([{
          type: vscode.FileChangeType.Changed,
          uri: uri,
        }]);
      }, 0);

      return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: 0,
        size: 65536,
      };
    }

    let {path} = explodeUri(uri);
    let obj = await kube.api.fetch(path).then(r => r.json()) as any;

    let ctimeIso = obj.metadata?.creationTimestamp;
    let ctime = ctimeIso ? new Date(ctimeIso).getTime() : 0;
    let generation = obj.metadata?.generation;
    let mtime = generation ? ctime + generation : new Date().getTime();

    return {
        type: vscode.FileType.File,
        ctime: ctime,
        mtime: mtime,
        size: 65536,
    };
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return [];
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    // noop
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    let {path, mimetype} = explodeUri(uri);

    if (mimetype === 'application/yaml') {
      let config = vscode.workspace.getConfiguration('kubernator');
      let obj = await kube.api.fetch(path).then(r => r.json()) as any;

      if (!config.showManagedFields && obj.metadata) {
        delete obj.metadata.managedFields;
      }

      if (config.stripKubectlLastAppliedConfiguration && obj.metadata?.annotations) {
        delete obj.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
        if (Object.keys(obj.metadata.annotations).length === 0) {
          delete obj.metadata.annotations;
        }
      }

      let text = kube.yaml.stringify(obj, {
        decodeSecrets: config.decodeSecrets
      });
      return Buffer.from(text);
    }

    return kube.api.fetch(path, mimetype).then(r => r.buffer());
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
  	if (!vscode.window.state.focused) {
      // prevent autosave, see https://github.com/Microsoft/vscode/issues/42170
      throw new Error('Not saving file without focus!');
    }
    if (vscode.window.activeTextEditor?.document.uri.toString() !== uri.toString()) {
      // prevent saving inactive file
      throw new Error('Not saving file without focus!');
    }

    // we could use raw content with kube.api.put,
    // but we need to apply some manifest preprocessing first
    let obj = kube.yaml.parse(content.toString());

    let {path} = explodeUri(uri);
    await kube.api.put(path, JSON.stringify(obj), 'application/json');
    this.forceReloadFiles.add(uri.path);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
    let {path} = explodeUri(uri);
    await kube.api.delete(path);
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
    throw new Error('Not implemented.');
  }
}

function explodeUri(uri: vscode.Uri): {path: string, mimetype?: string} {
  let path = uri.path;
  let ext = nodePath.extname(path);
  let mimetype = EXT_MIMETYPE_MAP[ext];

  if (mimetype === undefined) {
    throw Error(`Unknown extension "${ext}"`);
  }

  path = path.slice(0, -ext.length);
  return {path, mimetype};
}
