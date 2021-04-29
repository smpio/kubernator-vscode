import * as vscode from 'vscode';
import * as kube from './kube';
import * as interfaces from './interfaces';


export class ContentProvider implements vscode.TextDocumentContentProvider {
	static scheme = interfaces.DOCUMENT_SCHEME;

  async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken) {
    await kube.api.ready;

    let path = uri.path;
    let contentType = undefined;

    if (path.endsWith('.yaml')) {
      path = path.slice(0, -5);
      contentType = 'application/yaml';
    }

    return kube.api.fetch(path, contentType);
  }
}
