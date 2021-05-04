import fetch, { Response } from 'node-fetch';
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
      let fetch = (uri: string) => this.fetch(uri).then(r => r.json());
      this.groups = await discovery.discoverAllGroups(fetch);
    })();
  }

  async list(resource: Resource, namespace?: string): Promise<Object[]> {
    let uri = this.getResourceUri(resource, namespace);
    let objectList = await this.fetch(uri).then(r => r.json());
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

  async fetch(uri: string, contentType = 'application/json'): Promise<Response> {
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

    return response;
  }
}
