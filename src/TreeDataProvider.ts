import * as vscode from 'vscode';
import * as kube from './kube';
import { ttlCache, objectUri } from './util';

const GLOBAL_PSEUDO_NAMESPACE = '[global]';
const CORE_API_GROUP_NAME = '[core]';
const CACHE_TTL_MS = 5000;

export class TreeDataProvider implements vscode.TreeDataProvider<Node> {
  private root = new RootNode();
  private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined | null | void> = new vscode.EventEmitter<Node | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Node | undefined | null | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: Node) {
    return element;
  }

  async getChildren(element?: Node) {
    await kube.api.ready;

    if (element) {
      return element.getChildren();
    } else {
      return this.root.getChildren();
    }
  }

  async getParent(element: Node) {
    return element.getParent();
  }

  invalidate(element?: Node) {
    this._onDidChangeTreeData.fire(element);
  }
}

export abstract class Node extends vscode.TreeItem {
  abstract getChildren(): vscode.ProviderResult<Node[]>;
  abstract getParent(): vscode.ProviderResult<Node>;
}

class RootNode extends Node {
  id = 'root';

  constructor() {
    super('', vscode.TreeItemCollapsibleState.Expanded);
  }

  @ttlCache(CACHE_TTL_MS)
  async getChildren() {
    let namespaces = await kube.api.list(kube.api.groups[''].preferredVersion.resourcesByKind.Namespace);
    return [undefined, ...namespaces].map(ns => new NamespaceNode(ns?.metadata.name));
  }

  getParent() {
    return null;
  }
}

class NamespaceNode extends Node {
  public ns?: string;

  constructor(ns?: string) {
    let label = ns ?? GLOBAL_PSEUDO_NAMESPACE;
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'folder namespace';
    this.ns = ns;
    this.id = nodeID.namespace(ns);

    if (this.ns) {
      this.resourceUri = objectUri({
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: this.ns,
        },
      });
    }
  }

  @ttlCache(CACHE_TTL_MS)
  async getChildren() {
    let config = vscode.workspace.getConfiguration('kubernator');

    let groups = Object.values(kube.api.groups).sort((a, b) => {
      let name1 = a.name;
      let name2 = b.name;
      if (name1.indexOf('.') === -1) {
        name1 = '_' + name1;
      }
      if (name2.indexOf('.') === -1) {
        name2 = '_' + name2;
      }
      return name1.localeCompare(name2);
    });
    let groupVersions = groups.map(g => g.preferredVersion);
    let children = groupVersions.map(gv => new GroupNode(gv, this.ns));

    if (config.excludeEmpty) {
      children = await excludeEmpty(children);
    }
    return children;
  }

  getParent() {
    return null;
  }
}

export class GroupNode extends Node {
  public gv: kube.GroupVersion;
  public ns?: string;

  constructor(gv: kube.GroupVersion, ns?: string) {
    let config = vscode.workspace.getConfiguration('kubernator');

    let collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    if (config.expandCoreGroup && gv.group.name === '' ||
        config.expandUndottedGroups && gv.group.name.indexOf('.') === -1) {
      collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    let label = gv.group.name === '' ? CORE_API_GROUP_NAME : gv.group.name;

    super(label, collapsibleState);
    this.contextValue = 'folder group';
    this.gv = gv;
    this.ns = ns;
    this.id = nodeID.group(gv, ns);
  }

  @ttlCache(CACHE_TTL_MS)
  async getChildren() {
    let config = vscode.workspace.getConfiguration('kubernator');

    let resourceDoesMatch = (r: kube.Resource) => {
      if (r.verbs.indexOf('list') === -1) {
        return false;
      }
      if (r.verbs.indexOf('get') === -1) {
        return false;
      }

      return !!this.ns === r.namespaced;
    };

    let resources = Object.values(this.gv.resourcesByKind).filter(resourceDoesMatch);
    let children = resources.map(r => new ResourceNode(r, this.ns));

    if (config.excludeEmpty) {
      children = await excludeEmpty(children);
    }
    return children;
  }

  getParent() {
    return new NamespaceNode(this.ns);
  }
}

export class ResourceNode extends Node {
  constructor(public resource: kube.Resource, public ns?: string) {
    super(resource.kind, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'folder resource';
    this.id = nodeID.resource(resource, ns);
  }

  @ttlCache(CACHE_TTL_MS)
  async getChildren() {
    try {
      let objects = await kube.api.list(this.resource, this.ns);
      return objects.map(obj => new ObjectNode(obj));
    } catch(err) {
      if (err instanceof kube.APIError) {
        return [new ErrorNode(err)];
      } else {
        throw err;
      }
    }
  }

  getParent() {
    return new GroupNode(this.resource.groupVersion, this.ns);
  }
}

export class ObjectNode extends Node {
  resourceUri: vscode.Uri;

  constructor(public obj: kube.Object) {
    super(obj.metadata.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = `leaf object:${obj.kind}`;
    this.resourceUri = objectUri(obj);
    this.command = {
      title: 'open',
      command: 'vscode.open',
      arguments: [this.resourceUri],
    };
    this.id = nodeID.object(obj);
  }

  getChildren() {
    return [];
  }

  getParent() {
    return new ResourceNode(kube.api.getResource(this.obj), this.obj.metadata.namespace);
  }
}

class ErrorNode extends Node {
  constructor(public readonly err: Error) {
    super('Error: ' + err.message, vscode.TreeItemCollapsibleState.None);
    this.tooltip = err.message;
    this.contextValue = 'leaf error';
    // this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
  }

  getChildren() {
    return [];
  }

  getParent() {
    return null;
  }
}

async function excludeEmpty<N extends Node>(nodes: N[]) {
  return asyncFilter(nodes, async node => {
    let children = await Promise.resolve(node.getChildren());
    if (!children) {
      return false;
    }
    return children.some(child => child.contextValue !== 'error');
  });
}

async function asyncFilter<T>(arr: T[], predicate: (value: T) => Promise<boolean>) {
	const results = await Promise.all(arr.map(predicate));
	return arr.filter((_, index) => results[index]);
}

const nodeID = {
  namespace: (ns?: string) => ns ?? 'GLOBAL',
  group: (gv: kube.GroupVersion, ns?: string) => nodeID.namespace(ns) + ':' + gv.group.name,
  resource: (resource: kube.Resource, ns?: string) => nodeID.group(resource.groupVersion, ns) + ':' + resource.kind,
  object: (obj: kube.Object) => nodeID.resource(kube.api.getResource(obj), obj.metadata.namespace) + ':' + obj.metadata.name,
};
