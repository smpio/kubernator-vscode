import { Group, GroupVersion, Resource } from "./interfaces";

type FetchFunction = (uri: string) => any;

const coreRawGV = {
  groupVersion: 'v1',
  version: 'v1',
};

const coreRawGroup = {
  name: '',
  versions: [coreRawGV],
  preferredVersion: coreRawGV,
};

export async function discoverAllGroups(fetch: FetchFunction): Promise<{[groupName: string]: Group}> {
  let rawGroupList = await fetch('apis');
  rawGroupList.groups.push(coreRawGroup);

  let groups: {[groupName: string]: Group} = {};
  let promises = rawGroupList.groups.map((rawGroup: any) => discoverGroup(rawGroup, fetch).then(group => {
    groups[group.name] = group;
  }));
  await Promise.all(promises);
  return groups;
}

async function discoverGroup(rawGroup: any, fetch: FetchFunction): Promise<Group> {
  let group = {
    name: rawGroup.name,
    versions: {} as {[version: string]: any},
    preferredVersion: null as any,
    bestVersion: {
      resourcesByKind: {} as {[kind: string]: Resource},
      resourcesByName: {} as {[kind: string]: Resource},
    },
  };

  let promises: Promise<GroupVersion>[] = rawGroup.versions.map(async (rawGV: any) => {
    let resourceListUri = rawGroup.name === '' ? 'api/' + rawGV.version : 'apis/' + rawGV.groupVersion;
    let resources = parseResourceList(await fetch(resourceListUri));
    let gv = {
      version: rawGV.version,
      resourcesByKind: mapByKind(resources),
      resourcesByName: mapByName(resources),
      group: group,
    };
    resources.forEach(resource => resource.groupVersion = gv);
    group.versions[gv.version] = gv;
    if (rawGV.groupVersion === rawGroup.preferredVersion.groupVersion) {
      group.preferredVersion = gv;
    }
    return gv;
  });

  let groupVersions = await Promise.all(promises);

  // first we assume that resources of latest version are best
  for (let gv of groupVersions) {
    for (let resource of Object.values(gv.resourcesByKind)) {
      group.bestVersion.resourcesByKind[resource.kind] = resource;
      group.bestVersion.resourcesByName[resource.name] = resource;
    }
  }

  // if there is preferred version of resource, use it
  for (let resource of Object.values(group.preferredVersion.resourcesByKind)) {
    let r = resource as Resource;
    group.bestVersion.resourcesByKind[r.kind] = r;
    group.bestVersion.resourcesByName[r.name] = r;
  }

  return group;
}

function parseResourceList(rawResourceList: any): Resource[] {
  const isNotSubresource = (resource: any) => resource.name.indexOf('/') === -1;
  return rawResourceList.resources.filter(isNotSubresource);
}

function mapByKind(resources: Resource[]): {[kind: string]: Resource} {
  return resources.reduce((map, resource) => {
    map[resource.kind] = resource;
    return map;
  }, {} as {[kind: string]: Resource});
}

function mapByName(resources: Resource[]): {[name: string]: Resource} {
  return resources.reduce((map, resource) => {
    map[resource.name] = resource;
    return map;
  }, {} as {[name: string]: Resource});
}
