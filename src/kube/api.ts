import fetch, { Response, BodyInit } from 'node-fetch';
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
    return this.request('GET', uri, contentType);
  }

  async put(uri: string, body: BodyInit, contentType = 'application/json'): Promise<Response> {
    return this.request('PUT', uri, contentType, body);
  }

  async delete(uri: string, contentType = 'application/json'): Promise<Response> {
    return this.request('DELETE', uri, contentType);
  }

  async request(method: string, uri: string, contentType: string, body?: BodyInit): Promise<Response> {
    console.debug(method, uri);

    let url = new URL(uri, this.apiURL);
    let headers: any = {
      Accept: contentType,  // eslint-disable-line @typescript-eslint/naming-convention
    };

    if (body) {
      headers['Content-Type'] = contentType;
    }

    let response = await fetch(url, {
      method: method,
      body: body,
      headers: headers,
    });

    if (!response.ok) {
      throw Error(`${method} ${uri}: ${response.status}: ${response.statusText}`);
    }

    return response;
  }
}
