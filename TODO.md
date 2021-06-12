# TODO

- on save conflict add option to overwrite (this can be done by removing resourceVersion)
- secret encoding/decoding
- refresh tree on save/delete
- status icons near deployments, ds, etc

- fsprovider -> readDirectory (for topbar nav)
- shadow non-interesting fields, make this configurable (maybe shadow defaults)
- links https://github.com/Azure/vscode-kubernetes-tools/blob/master/src/kuberesources.linkprovider.ts
- yaml schemas https://github.com/Azure/vscode-kubernetes-tools/tree/master/src/yaml-support
- multiple clusters: start `kubectl proxy` with `--context`

- https://code.visualstudio.com/docs/getstarted/tips-and-tricks#_preventing-dirty-writes
- compare with saved (compare dirty)
- load resources using api group with only preferredVersion, load non-preferred when needed only
- special view: some objects can have special view (simple describe, or complex graphs)
- if object is changed during save, try to save if it is safe (automerge)
- tree quick search
- limit concurrent requests to API - why?


## Can't be done

Or workaround not found.

- editor looses cursor position after saving existing object

  Document is reloaded with changes from API server after save and this resets cursor.
