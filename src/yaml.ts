import * as YAML from 'yaml';

export function parse(str: string): any {
  return YAML.parse(str, {
    version: '1.1',
  });
}

export function stringify(value: any): string {
  return YAML.stringify(value, {
    version: '1.1',
    indentSeq: false,
    simpleKeys: true,
  });
}
