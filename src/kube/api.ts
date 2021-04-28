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

  getObjectUri(resource: Resource, namespace: string, objectName: string): string {
    return this.getResourceUri(resource, namespace) + '/' + objectName;
  }

  async fetch(uri: string): Promise<any> {
    console.debug('API request:', uri);

    let url = new URL(uri, this.apiURL);
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',  // eslint-disable-line @typescript-eslint/naming-convention
      },
    });
    if (!response.ok) {
      throw Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}
