import * as nodePath from 'path';
import * as vscode from 'vscode';
import * as kube from './kube';
import * as interfaces from './interfaces';

const EXT_MIMETYPE_MAP: {[ext: string]: string} = {
  '.yaml': 'application/yaml',
  '.json': 'application/json',
};

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

    await kube.api.ready;

    let path = uri.path;
    if (path.endsWith('.yaml')) {
      path = path.slice(0, -5);
    }

    let obj = await kube.api.fetch(path).then(r => r.json());

    let ctimeIso = obj.metadata?.creationTimestamp;
    let ctime = ctimeIso ? new Date(ctimeIso).getTime() : 0;
    let resourceVersion = obj.metadata?.resourceVersion;
    let mtime = resourceVersion ? ctime + parseInt(resourceVersion) : new Date().getTime();

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
    await kube.api.ready;
    let {path, mimetype} = explodeUri(uri);
    return kube.api.fetch(path, mimetype).then(r => r.buffer());
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
  	if (!vscode.window.state.focused) {
      // prevent autosave, see https://github.com/Microsoft/vscode/issues/42170
      throw new Error('Not saving file without window focus!');
    }

    await kube.api.ready;
    let {path, mimetype} = explodeUri(uri);
    await kube.api.put(path, content, mimetype);
    this.forceReloadFiles.add(uri.path);
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean; }): Promise<void> {
    await kube.api.ready;
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
