# TODO

- editor looses cursor position after saving existing object
- refresh tree on save/delete
- fsprovider -> readDirectory (for topbar nav)
- https://code.visualstudio.com/docs/getstarted/tips-and-tricks#_preventing-dirty-writes
- compare with saved (compare dirty)
- discover only preferred
- reveal
- PVC -> right click -> Go to PV
- status icons near deployments, ds, etc
- metadata.selfLink is deprecated
- open ns obj on click on namespace
- load resources using api group with only preferredVersion, load non-preferred when needed only
- special view: some objects can have special view (simple describe, or complex graphs)
- if object is changed during save, try to save if it is safe (automerge)
- tree quick search
- limit concurrent requests to API - why?
- shadow non-interesting fields, make this configurable (maybe shadow defaults)
- right click on pod -> kubectl exec, kubectl debug
- start kubectl proxy with extension (example: https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)
- links https://github.com/Azure/vscode-kubernetes-tools/blob/master/src/kuberesources.linkprovider.ts
- yaml schemas https://github.com/Azure/vscode-kubernetes-tools/tree/master/src/yaml-support