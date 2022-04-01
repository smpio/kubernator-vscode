type FetchFunction = (uri: string) => any;
import {Definition} from './interfaces';

export async function loadDefinitions(fetch: FetchFunction) {
  const RO_REGEX = /read[ -]only/i;
  const DEFAULT_REGEX = /defaults?\s+(?:to|\w+\s+is)\s+['"`]?([^"'`\s\.\,]+)['"`]?[\,\.\s]/i;
  const TRUE_REGEX = /true|yes|1/i;
  const REF_PREFIX = '#/definitions/';
  let scheme = await fetch('openapi/v2');

  function cleanRecursive(definitions: {[name: string]: Definition}) {
    for (let def of Object.values(definitions)) {
      def.readOnly = RO_REGEX.test(def.description);

      if ('$ref' in def) {
        def.type = 'ref';
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

  scheme.definitions['io.k8s.api.apps.v1.DeploymentStrategy'].default = {
    type: 'RollingUpdate',
    rollingUpdate: {
      maxSurge: '25%',
      maxUnavailable: '25%',
    },
  };
  scheme.definitions['io.k8s.api.apps.v1.DaemonSetUpdateStrategy'].default = {
    type: 'RollingUpdate',
    rollingUpdate: {
      maxUnavailable: 1,
    },
  };
  scheme.definitions['io.k8s.api.apps.v1.StatefulSetUpdateStrategy'].default = {
    type: 'RollingUpdate',
    rollingUpdate: {
      partition: 0,
    },
  };

  scheme.definitions['io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta'].properties.finalizers.readOnly = true;
  scheme.definitions['io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta'].properties.ownerReferences.readOnly = true;
  scheme.definitions['io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta'].properties.generateName.readOnly = true;
  scheme.definitions['io.k8s.api.core.v1.PodSpec'].properties.schedulerName.default = 'default-scheduler';
  scheme.definitions['io.k8s.api.core.v1.PodSecurityContext'].default = {};
  scheme.definitions['io.k8s.api.core.v1.ResourceRequirements'].default = {};

  return scheme.definitions;
}
