import * as vscode from 'vscode';
import * as kube from './kube';
import * as interfaces from './interfaces';


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

    let path = uri.path;
    let contentType = undefined;

    if (path.endsWith('.yaml')) {
      path = path.slice(0, -5);
      contentType = 'application/yaml';
    }

    return kube.api.fetch(path, contentType).then(r => r.buffer());
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
  	if (!vscode.window.state.focused) {
      throw new Error('Not saving file without window focus!');
    }

    await kube.api.ready;

    let path = uri.path;
    let contentType = undefined;

    if (path.endsWith('.yaml')) {
      path = path.slice(0, -5);
      contentType = 'application/yaml';
    }

    await kube.api.put(path, content, contentType);
    this.forceReloadFiles.add(uri.path);
  }

  delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
    throw new Error('Not implemented.');
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
    throw new Error('Not implemented.');
  }
}
