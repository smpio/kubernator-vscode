export interface Group {
  name: string;
  versions: {[version: string]: GroupVersion};
  preferredVersion: GroupVersion;
}

export interface GroupVersion {
  group: Group;
  version: string;
  resourcesByKind: {[kind: string]: Resource};
  resourcesByName: {[name: string]: Resource};
}

export interface Resource {
  groupVersion: GroupVersion;
  kind: string;
  name: string;
  namespaced: boolean;
  verbs: string[];
}

export interface Object {
  metadata: {
    name: string;
    selfLink: string;
    namespace?: string;
  };
}
