import * as vscode from 'vscode';

export class TreeDataProvider implements vscode.TreeDataProvider<Node> {
  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Node): Node[] {
    return [new Node("hello", vscode.TreeItemCollapsibleState.None)];
  }
}

class Node extends vscode.TreeItem {
}
