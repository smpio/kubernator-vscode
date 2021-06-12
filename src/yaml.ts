import * as YAML from 'yaml';

interface ParseOptions {
  encodeSecrets?: boolean;
}

interface StringifyOptions {
  decodeSecrets?: boolean;
}

// disable "folding" of block scalars, which replaces "|" with ">"
YAML.scalarOptions.str.fold.lineWidth = 0;


export function parse(str: string, {encodeSecrets = false}: ParseOptions = {}): any {
  let value = YAML.parse(str, {
    version: '1.1',
  });

  if (encodeSecrets && value.apiVersion === 'v1' && value.kind === 'Secret') {
    value = {
      ...value,
      data: Object.fromEntries(Object.entries(value.data).map(([k, v]) => [k, b64encode(v as string)])),
    };
  }

  return value;
}

export function stringify(value: any, {decodeSecrets = false}: StringifyOptions = {}): string {
  if (decodeSecrets && value.apiVersion === 'v1' && value.kind === 'Secret') {
    value = {
      ...value,
      data: Object.fromEntries(Object.entries(value.data).map(([k, v]) => [k, b64decode(v as string)])),
    };
  }

  return YAML.stringify(value, {
    version: '1.1',
    indentSeq: false,
    simpleKeys: true,
  });
}

function b64encode(v: string): string {
  return Buffer.from(v).toString('base64');
}

function b64decode(v: string): string {
  return Buffer.from(v, 'base64').toString();
}
