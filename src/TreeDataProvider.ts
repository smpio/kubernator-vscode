import * as vscode from 'vscode';
import * as kube from './kube';
import { ttlCache, objectUri, ttlCacheClear } from './util';

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
    if (!kube.api.ready) {
      return [];
    }

    if (element) {
      return element.getChildren();
    } else {
      return this.root.getChildren();
    }
  }

  async getParent(element: Node) {
    return element.getParent();
  }

  invalidate(element?: Node, {keepCache = false}: {keepCache: boolean} = {keepCache: false}) {
    if (!keepCache) {
      if (!element) {
        this.root.invalidate();
      } else {
        element.invalidate();
      }
    }

    this._onDidChangeTreeData.fire(element);
  }
}

export abstract class Node extends vscode.TreeItem {
  abstract getChildren(): vscode.ProviderResult<Node[]>;
  abstract getParent(): vscode.ProviderResult<Node>;

  invalidate(): void {
    ttlCacheClear(this, 'getChildren');
  }
}

class RootNode extends Node {
  id = 'root';

  constructor() {
    super('', vscode.TreeItemCollapsibleState.Expanded);
  }

  @ttlCache(CACHE_TTL_MS)
  async getChildren() {
    let namespaces = await kube.api.list(kube.api.groups[''].bestVersion.resourcesByKind.Namespace);
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
    this.contextValue = ns ? 'folder namespace' : 'folder';
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
    let children = groups.map(g => new GroupNode(g, this.ns));

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
  public group: kube.Group;
  public ns?: string;

  constructor(group: kube.Group, ns?: string) {
    let config = vscode.workspace.getConfiguration('kubernator');

    let collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    if (config.expandCoreGroup && group.name === '' ||
        config.expandUndottedGroups && group.name.indexOf('.') === -1) {
      collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    let label = group.name === '' ? CORE_API_GROUP_NAME : group.name;

    super(label, collapsibleState);
    this.contextValue = 'folder group';
    this.group = group;
    this.ns = ns;
    this.id = nodeID.group(group, ns);
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

    let resources = Object.values(this.group.bestVersion.resourcesByKind).filter(resourceDoesMatch);
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
    return new GroupNode(this.resource.groupVersion.group, this.ns);
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

    let decorator = getObjectDecorator(obj);
    let color = decorator?.color && new vscode.ThemeColor(decorator.color);
    this.description = decorator?.text;
    this.iconPath = new vscode.ThemeIcon('debug-breakpoint-data-unverified', color);
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
    this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
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
  group: (group: kube.Group, ns?: string) => nodeID.namespace(ns) + ':' + group.name,
  resource: (resource: kube.Resource, ns?: string) => nodeID.group(resource.groupVersion.group, ns) + ':' + resource.kind,
  object: (obj: kube.Object) => nodeID.resource(kube.api.getResource(obj), obj.metadata.namespace) + ':' + obj.metadata.name,
};

function getObjectDecorator (obj: any): ObjectDecorator|undefined {
  let s = obj.status;
  if (s) {
    let replicas = s.replicas ?? s.desiredNumberScheduled;
    let ready = s.readyReplicas ?? s.numberReady;

    if (replicas !== undefined) {
      if (ready !== undefined) {
        return {
          text: `${ready}/${replicas}`,
          color: ready === replicas ? 'notebookStatusSuccessIcon.foreground' : 'notebookStatusRunningIcon.foreground',
        };
      } else {
        return {text: `${replicas}`};
      }
    }

    if (s.succeeded !== undefined) {
      if (s.succeeded) {
        return decorators.success;
      } else {
        return {
          text: '✗',
          color: 'notebookStatusErrorIcon.foreground',
        };
      }
    }

    if (s.containerStatuses !== undefined) {
      let reasons = s.containerStatuses.map((s: any) => s.state.terminated?.reason ?? s.state.waiting?.reason);
      let reason = reasons.find((r: any) => !!r);
      if (reason) {
        return {
          text: reason,
          color: 'notebookStatusErrorIcon.foreground',
        };
      }
    }

    if (s.phase !== undefined) {
      if (s.phase === 'Bound' || s.phase === 'Succeeded') {
        return decorators.success;
      } else {
        return {
          text: s.phase,
          color: 'notebookStatusRunningIcon.foreground',
        };
      }
    }
  }
}

interface ObjectDecorator {
  text?: string;
  color?: string;
}

const decorators = {
  success: {
    text: '✓',
    color: 'notebookStatusSuccessIcon.foreground',
  },
};
