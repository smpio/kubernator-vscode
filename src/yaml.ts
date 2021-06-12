import * as YAML from 'yaml';


// disable "folding" of block scalars, which replaces "|" with ">"
YAML.scalarOptions.str.fold.lineWidth = 0;


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
