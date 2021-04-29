import fetch from 'node-fetch';
import { URL } from 'url';
import * as discovery from './discovery';
import { Group, Resource, Object } from './interfaces';

export default class API {
  apiURL?: string;
  ready: Promise<void> = new Promise(() => {});
  groups: {[groupName: string]: Group} = {};

  constructor(apiURL?: string) {
    if (apiURL) {
      this.configure(apiURL);
    }
  }

  configure(apiURL: string): Promise<void> {
    this.apiURL = apiURL;
    this.groups = {};
    return this.ready = (async () => {
      this.groups = await discovery.discoverAllGroups(this.fetch.bind(this));
    })();
  }

  async list(resource: Resource, namespace?: string): Promise<Object[]> {
    let uri = this.getResourceUri(resource, namespace);
    let objectList = await this.fetch(uri);
    return objectList.items;
  }

  getResourceUri(resource: Resource, namespace?: string): string {
    let uri = '';
    if (resource.groupVersion.group.name === '') {
      uri = 'api';
    } else {
      uri = 'apis/' + resource.groupVersion.group.name;
    }
    uri += '/' + resource.groupVersion.version;
    if (resource.namespaced) {
      uri += '/namespaces/' + namespace;
    }
    uri += '/' + resource.name;
    return uri;
  }

  // TODO: remove, not used
  getResource(groupVersion: string, kind: string): Resource {
    let groupName, version;
    let separatorPos = groupVersion.indexOf('/');

    if (separatorPos === -1) {
      groupName = '';
      version = groupVersion;
    } else {
      groupName = groupVersion.slice(0, separatorPos);
      version = groupVersion.slice(separatorPos + 1);
    }

    let group = this.groups[groupName];
    if (!group) {
      throw new Error(`Unknown group ${groupName}`);
    }

    let gv = group.versions[version];
    if (!gv) {
      throw new Error(`Unknown version ${groupVersion}`);
    }

    let resource = gv.resourcesByKind[kind];
    if (!resource) {
      throw new Error(`Unknown kind ${kind} in group version ${groupVersion}`);
    }

    return resource;
  }

  // TODO: remove, not used
  getObjectUri(obj: Object): string {
    let resource = this.getResource(obj.apiVersion, obj.kind);
    return this.getResourceUri(resource, obj.metadata.namespace) + '/' + obj.metadata.name;
  }

  async fetch(uri: string, contentType = 'application/json'): Promise<any> {
    console.debug('API request:', uri);

    let url = new URL(uri, this.apiURL);
    const response = await fetch(url, {
      headers: {
        Accept: contentType,  // eslint-disable-line @typescript-eslint/naming-convention
      },
    });
    if (!response.ok) {
      throw Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    if (contentType === 'application/json') {
      return response.json();
    } else {
      return (await response.blob()).text();
    }
  }
}
