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

  async fetch(uri: string, accept = 'application/json'): Promise<Response> {
    return this.request('GET', uri, {accept});
  }

  async put(uri: string, body: BodyInit, contentType = 'application/json', accept = 'application/json'): Promise<Response> {
    return this.request('PUT', uri, {body, contentType, accept});
  }

  async delete(uri: string, accept = 'application/json'): Promise<Response> {
    return this.request('DELETE', uri, {accept});
  }

  async request(method: string, uri: string, options: {accept: string, contentType?: string, body?: BodyInit}): Promise<Response> {
    console.debug(method, uri);

    let url = new URL(uri, this.apiURL);
    let headers: any = {
      Accept: options.accept,  // eslint-disable-line @typescript-eslint/naming-convention
    };

    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    }

    let response = await fetch(url, {
      method: method,
      body: options.body,
      headers: headers,
    });

    if (!response.ok) {
      let err = await APIError.fromResponse(response);
      throw err;
    }

    return response;
  }
}

export class APIError extends Error {
  response: Response;

  constructor(response: Response, message?: string) {
    if (message) {
      super(message);
    } else {
      super(`${response.status} ${response.statusText}`);
    }

    this.name = this.constructor.name;
    this.response = response;
  }

  static async fromResponse(response: Response) {
    let message;

    try {
      let errorData = await response.json();
      if (errorData.apiVersion === 'v1' && errorData.kind === 'Status') {
        message = errorData.message;
      }
    } catch (err) {
    }

    return new APIError(response, message);
  }
}
