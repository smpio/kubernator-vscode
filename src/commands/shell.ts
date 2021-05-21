import * as vscode from 'vscode';
import { ObjectNode } from '../TreeDataProvider';

export async function startShell (node: ObjectNode) {
  let shellsToTry = ['sh'];
  let pod = node.obj as any;

  if (pod.spec?.containers?.length > 1) {
    let selected = await vscode.window.showQuickPick(pod.spec.containers.map((c: any) => c.name));

    if (!selected) {
      return;
    }

    runExec(shellsToTry, selected);
  } else {
    runExec(shellsToTry);
  }

  function runExec(shells: string[], container?: string) {
    const terminal = vscode.window.createTerminal(pod.metadata.name);

    let shell = shells[0];

    let containerOpts = '';
    if (container) {
      containerOpts = '-c ' + container;
    }

    terminal.sendText(`exec kubectl -n ${pod.metadata.namespace} exec -it ${pod.metadata.name} ${containerOpts} -- ${shell}`);
    terminal.show();

    if (shells.length > 1) {
      let closeHandler = vscode.window.onDidCloseTerminal(t => {
        if (t !== terminal) {
          return;
        }

        if (t.exitStatus?.code === 126) {
          runExec(shells.slice(1));
        }
        closeHandler.dispose();
      });
    }
  }
}
