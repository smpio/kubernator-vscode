# TODO

- clean Job `batch.kubernetes.io/controller-uid`, `batch.kubernetes.io/job-name` labels, matchLabels

- pod, service port-forward

- clean

- if object is changed during save, try to save if it is safe (automerge) https://code.visualstudio.com/docs/getstarted/tips-and-tricks#_preventing-dirty-writes (SEE BRANCHES)
- compare with saved (compare dirty) (SEE BRANCHES)
- Server-Side Apply

- extract Pod from Deployment, StatefulSet, etc
- update packages (see new `yo code` output)
- on save conflict add option to overwrite (this can be done by removing resourceVersion) (SEE BRANCHES)
- special view: some objects can have special view (simple describe, or complex graphs)

- fsprovider -> readDirectory (for topbar nav)
- shadow non-interesting fields, make this configurable (maybe shadow defaults)
- links https://github.com/Azure/vscode-kubernetes-tools/blob/master/src/kuberesources.linkprovider.ts
- yaml schemas https://github.com/Azure/vscode-kubernetes-tools/tree/master/src/yaml-support

- load resources using api group with only preferredVersion, load non-preferred when needed only
- Open API v3
- Aggregated Discovery https://kubernetes.io/docs/concepts/overview/kubernetes-api/#aggregated-discovery

- tree quick search
- limit concurrent requests to API - why?
- Go to PV quick action in editor (opens PV editor)
- Go to PVC quick action in editor (opens PVC editor)
- reveal from editor with external yaml file


## Can't be done

Or workaround not found.

- editor looses cursor position after saving existing object

  Document is reloaded with changes from API server after save and this resets cursor.

- refresh tree on save/delete

  See branches refresh and refresh2 and https://stackoverflow.com/questions/67636127/vscode-extensions-treedataprovider-inconsistency
