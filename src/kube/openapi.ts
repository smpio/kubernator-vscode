type FetchFunction = (uri: string) => any;
import {Definition} from './interfaces';

export async function loadDefinitions(fetch: FetchFunction) {
  const RO_REGEX = /read[ -]only/i;
  const DEFAULT_REGEX = /defaults?\s+to\s+['"]?(\w+)['"]?[\.\s]/i;
  const TRUE_REGEX = /true|yes|1/i;
  const REF_PREFIX = '#/definitions/';
  let scheme = await fetch('openapi/v2');

  function cleanRecursive(definitions: {[name: string]: Definition}) {
    for (let def of Object.values(definitions)) {
      def.readOnly = RO_REGEX.test(def.description);

      if ('$ref' in def) {
        if (!def.$ref.startsWith(REF_PREFIX)) {
          throw new Error('Unknown ref: ' + def.$ref);
        }
        def.$ref = def.$ref.slice(REF_PREFIX.length);
      } else if ('properties' in def) {
        def.type = 'object';
        if (def.properties) {
          cleanRecursive(def.properties);
        } else {
          def.properties = {};
        }
      } else if (def.type === 'array') {
        cleanRecursive({items: def.items});
      } else if ((def as any).type === 'object') {
        (def as any).properties = {};
      } else {
        let defaultMatch = DEFAULT_REGEX.exec(def.description);
        if (defaultMatch) {
          def.default = defaultMatch[1];
          if (def.type === 'boolean') {
            def.default = TRUE_REGEX.test(def.default);
          } else if (def.type === 'integer') {
            def.default = parseInt(def.default);
          } else if (def.type === 'number') {
            def.default = parseFloat(def.type);
          }
        }
      }
    }
  }

  cleanRecursive(scheme.definitions);
  return scheme.definitions;
}

// export async function loadDefinitions(fetch: FetchFunction) {
//   const REF_PREFIX = '#/definitions/';
//   let scheme = await fetch('openapi/v2');
//   let namedDefinitions: Definition[] = [];

//   function cleanRecursive(definitions: {[name: string]: Definition}) {
//     for (let [id, def] of Object.entries(definitions)) {
//       if ('$ref' in def) {
//         let ref = def.$ref;
//         if (!ref.startsWith(REF_PREFIX)) {
//           throw new Error('Unknown ref: ' + ref);
//         }
//         ref = ref.slice(REF_PREFIX.length);

//         definitions[id] = scheme.definitions[ref];
//       } else if ('properties' in def && def.properties) {
//         cleanRecursive(def.properties);
//       } else if (def.type === 'array') {
//         def.items = cleanRecursive({items: def.items}).items;
//       }

//       if (def['x-kubernetes-group-version-kind']) {
//         namedDefinitions.push(def);
//       }
//     }

//     return definitions;
//   }

//   cleanRecursive(scheme.definitions);
//   return namedDefinitions;
// }
