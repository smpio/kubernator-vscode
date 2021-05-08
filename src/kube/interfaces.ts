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
  definition?: Definition;
}

export interface Object {
  metadata: {
    name: string;
    selfLink: string;
    namespace?: string;
  };
}

export type Definition = PrimitiveDefinition | ObjectDefinition | ArrayDefinition | RefDefinition;

export interface DefinitionCommon {
  description: string;
  ['x-kubernetes-group-version-kind']?: DefinitionGVK[];
  readOnly: boolean;
}

export interface PrimitiveDefinition extends DefinitionCommon {
  type: 'string' | 'boolean' | 'integer';
}

export interface ObjectDefinition extends DefinitionCommon {
  type?: 'object';
  properties?: {[name: string]: Definition};
}

export interface ArrayDefinition extends DefinitionCommon {
  type: 'array';
  items: Definition;
}

export interface RefDefinition extends DefinitionCommon {
  $ref: string;
}

export interface DefinitionGVK {
  group: string;
  version: string;
  kind: string;
}
