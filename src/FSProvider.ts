import * as vscode from 'vscode';
import * as kube from './kube';
import * as interfaces from './interfaces';


export class FSProvider implements vscode.FileSystemProvider {
	static scheme = interfaces.DOCUMENT_SCHEME;

  private onDidChangeFileEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.onDidChangeFileEmitter.event;

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: 0,
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

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
    throw new Error('Method not implemented.');
  }

  delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
    throw new Error('Method not implemented.');
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
    throw new Error('Method not implemented.');
  }
}
