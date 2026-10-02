# Manifest and capabilities

`photon.plugin.json` is distinct from a Photoshop `manifest.json`:

```json
{
  "manifestVersion": 1,
  "sdkVersion": 1,
  "id": "example.native-panel",
  "name": "Example Panel",
  "version": "1.0.0",
  "main": "index.html",
  "panels": [{"id": "main", "label": "Example", "ui": "native"}],
  "commands": [{"id": "run", "label": "Run Example", "scope": "app", "panel": "main", "menu": "Plugins"}],
  "permissions": {"document": "readWrite"}
}
```

| Field | Meaning |
| --- | --- |
| manifestVersion / sdkVersion | Both must equal 1; unsupported versions are rejected |
| id | Stable plugin identity; letters, numbers, dot, underscore, hyphen; maximum 128 characters |
| name / version | Display name and semantic version; replacing the same ID preserves enabled state |
| main | Local HTML entrypoint; package traversal is rejected |
| panels | Unique IDs, display labels, native/custom UI, optional minimumSize |
| commands | Unique IDs, labels, scope, owning panel, optional menu, contexts, binding, keywords |
| permissions | Only capabilities listed below are accepted |

Command scope is `app`, `document`, `selection`, or `layer`. Menus may be `Image`, `Edit`,
`Filter`, or `Plugins`; selection and layer menus use `contexts: ["selection", "layer"]`.
Photon namespaces IDs, includes commands in search and shortcut settings, and removes them
on disable or uninstall. Prefer no default shortcut to avoid stealing existing bindings.
Bindings use Photon notation, such as `Mod+Alt+KeyG`; users can rebind them.

## Capabilities

| Permission | Effect |
| --- | --- |
| document: read | Inspect documents, capture snapshots, read pixels, enumerate operations |
| document: readWrite | Also write pixels, place images, execute operations, and use transactions |
| files: true | Native file/folder pickers and bounded binary read/write to granted locations |
| network: string[] | HTTPS origins the network broker may contact |
| credentials: true | Photon-managed credential entry, status, deletion, and authenticated requests |
| customEndpoints: true | Ask the user to approve an additional exact origin, including a local endpoint |
| credentialOrigins | Map a credential's primary origin to declared network aliases for regional APIs |

Network patterns may contain one complete wildcard subdomain label, e.g.
`https://api.*.bfl.ai`. This permits regional API origins; it does not grant a key access to
them unless `credentialOrigins` also declares them:

```json
{
  "network": ["https://api.bfl.ai", "https://api.*.bfl.ai"],
  "credentials": true,
  "credentialOrigins": {"https://api.bfl.ai": ["https://api.*.bfl.ai"]}
}
```

Declare only needed capabilities. Native panels inherit Photon themes, scale, focus behavior,
and controls. Custom panels retain their own HTML but must use bundled scripts and styles.
