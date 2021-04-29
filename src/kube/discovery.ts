import { Group, Resource } from "./interfaces";

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

// TODO: convert to class
// TODO: simplify as in python (index by strings)

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
  };

  let promises = rawGroup.versions.map(async (rawGV: any) => {
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
  });

  await Promise.all(promises);
  return group;
}

function parseResourceList(rawResourceList: any): Resource[] {
  // TODO: add subresources
  return rawResourceList.resources.filter((resource: any) => resource.name.indexOf('/') === -1);
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
