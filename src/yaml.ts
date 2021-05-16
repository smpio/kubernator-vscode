import * as YAML from 'yaml';

export function parse(str: string): any {
  return YAML.parse(str);
}

export function stringify(value: any): string {
  return YAML.stringify(value, {
    indentSeq: false,
    simpleKeys: true,
  });
}
