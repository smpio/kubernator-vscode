import fetch, { Response, BodyInit } from 'node-fetch';
import { URL } from 'url';
import * as discovery from './discovery';
import * as openapi from './openapi';
import { Group, Resource, Object, Definition } from './interfaces';

export default class API {
  apiURL?: string;
  ready: Promise<void> = new Promise(() => {});
  groups: {[groupName: string]: Group} = {};
  definitions: {[id: string]: Definition} = {};

  constructor(apiURL?: string) {
    if (apiURL) {
      this.configure(apiURL);
    }
  }

  configure(apiURL: string): Promise<void> {
    this.apiURL = apiURL;
    this.groups = {};
    this.definitions = {};

    return this.ready = (async () => {
      let fetch = (uri: string) => this.fetch(uri).then(r => r.json());
      let definitionsPromise = openapi.loadDefinitions(fetch);
      this.groups = await discovery.discoverAllGroups(fetch);
      this.definitions = await definitionsPromise;

      for (let def of Object.values(this.definitions)) {
        let gvks = def['x-kubernetes-group-version-kind'];
        if (!gvks) {
          continue;
        }

        if ('properties' in def && def.properties?.status) {
          def.properties.status.readOnly = true;
        }

        for (let gvk of gvks) {
          let group = this.groups[gvk.group];
          if (!group) {
            continue;
          }
          let groupVersion = group.versions[gvk.version];
          if (!groupVersion) {
            continue;
          }
          let resource = groupVersion.resourcesByKind[gvk.kind];
          if (!resource) {
            continue;
          }
          resource.definition = def;
        }
      }
    })();
  }

  async list(resource: Resource, namespace?: string): Promise<Object[]> {
    let uri = this.getResourceUri(resource, namespace);
    let objectList = await this.fetch(uri).then(r => r.json());

    // decorate
    let apiVersion = resource.groupVersion.group.name + '/' + resource.groupVersion.version;
    if (apiVersion[0] === '/') {
      apiVersion = resource.groupVersion.version;
    }
    for (let obj of objectList.items) {
      obj.apiVersion = apiVersion;
      obj.kind = resource.kind;
    }

    return objectList.items;
  }

  getObjectUri(obj: Object): string {
    let resource = this.getResource(obj);
    return this.getResourceUri(resource, obj.metadata.namespace) + '/' + obj.metadata.name;
  }

  getResourceUri(resource: Resource, namespace?: string): string {
    let uri;
    if (resource.groupVersion.group.name === '') {
      uri = '/api';
    } else {
      uri = '/apis/' + resource.groupVersion.group.name;
    }
    uri += '/' + resource.groupVersion.version;
    if (resource.namespaced) {
      uri += '/namespaces/' + namespace;
    }
    uri += '/' + resource.name;
    return uri;
  }

  getResource(obj: Object): Resource;
  getResource(groupVersion: string, kind: string): Resource;
  getResource(a: any, b?: any): Resource {
    let groupVersion, kind;

    if (typeof a !== 'string') {
      let obj = a as Object;
      groupVersion = obj.apiVersion;
      kind = obj.kind;
    } else {
      groupVersion = a;
      kind = b;
    }

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

  async fetch(uri: string, accept = 'application/json'): Promise<Response> {
    return this.request('GET', uri, {accept});
  }

  async put(uri: string, body: BodyInit, contentType = 'application/json', accept = 'application/json'): Promise<Response> {
    return this.request('PUT', uri, {body, contentType, accept});
  }

  async delete(uri: string, accept = 'application/json'): Promise<Response> {
    return this.request('DELETE', uri, {accept});
  }

  async post(uri: string, body: BodyInit, contentType = 'application/json', accept = 'application/json'): Promise<Response> {
    return this.request('POST', uri, {body, contentType, accept});
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
