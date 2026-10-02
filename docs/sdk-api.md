# SDK v1 API reference

Import `definePlugin`, `getPhoton`, `PluginError`, and SDK types from `@photon/plugin-sdk`.
`definePlugin(activate)` activates once per runtime; return a `Disposable` to clean up handlers.
`getPhoton()` accesses the same initialized API. `PhotonApi.version` is `1.0.0`.
`createPhotonApi` is the bridge factory used by Photon and by test mocks, not a separate transport.

All host methods return promises unless noted. The API returns copies, never mutable editor
objects. See the included `.d.ts` for exact interfaces and optional fields.

## UI, commands and events

| Method | Result / contract |
| --- | --- |
| ui.render(panel, model) | Replace the declared native panel's control model |
| ui.onEvent(handler) | Disposable subscription receiving `{id, panel, value}` |
| ui.dialog(model) | Native modal model; resolves to its button event and values, or null on dismissal |
| ui.alert(message) | Host-owned message dialog |
| commands.on(id, handler) | Disposable handler for a declared local command ID |
| events.subscribe(handler) | Disposable host event subscription |

`PanelModel` contains optional `title` and `controls`. `Control.type` supports `group`, `text`,
`input`, `textarea`, `number`, `checkbox`, `select`, `tabs`, `button`, `image`, and `progress`.
Common fields: `id`, `label`, `value`, `disabled`, `description`. Text uses `text`; group uses
`children`; selects/tabs use `options: [{value,label}]`; image uses a PNG/JPEG/WebP data URL;
progress uses a number from 0 to 1 or an indeterminate value. Buttons support primary tone;
text supports danger tone. Escape dismisses modal dialogs.

## Settings and credentials

| Method | Result / contract |
| --- | --- |
| settings.get<T>() | Stored JSON object, initially `{}` |
| settings.set(object) | Atomically replace settings, maximum 1 MB |
| credentials.configure(id, label, origin) | Photon password dialog; returns CredentialInfo |
| credentials.status(id) | `{id, configured, persistent, origin?}`, never a key |
| credentials.delete(id) | Delete that plugin's saved/session key |

IDs are scoped to the plugin. Settings persist through replacement/reload. Use settings for
preferences, never API keys. Linux without a secure storage backend uses session-only keys.

## Network and jobs

| Method | Result / contract |
| --- | --- |
| network.allowEndpoint(origin) | User approval for an exact custom origin; remembered locally |
| network.request<T>(request) | `{status, headers, body}`, HTTP errors remain inspectable |
| jobs.run(label, callback) | Host-managed job, automatic cleanup, AbortSignal and progress |

`NetworkRequest`: URL, GET/POST/DELETE method, nonsecret headers, `json` or `multipart`, optional
credential reference, job ID, and `response: "json" | "bytes"`. Multipart entries contain
`name` with `text` or `bytes`, `filename`, and `mime`. Authentication references contain `id`,
`header` (Authorization, x-api-key, x-goog-api-key, x-key), and optional prefix. Authorization
defaults to `Bearer `; other headers default to no prefix. Use `Key ` for fal.ai.

`JobContext`: `id`, `signal`, `progress(label, fraction?)`. Pass its ID to every provider
request. At most four jobs per runtime; requests and polls must be bounded and cancellable.

## Documents and pixels

| Method | Result / contract |
| --- | --- |
| documents.list() / active() | DocumentInfo array / current document or null |
| documents.operations(query?) | Available registry entries with descriptions and input schemas |
| documents.capture(options?) | Capture token, document/revision, crop bounds, RGBA8 pixels, optional mask |
| documents.release(token) | Release a retained capture |
| documents.applyImage(options) | New raster layer; returns documentId/layerId |
| documents.pixels({documentId, layerId}) | PixelTransfer at original depth/profile, full-range samples |
| documents.writePixels(documentId, layerId, transfer, label?) | Replace pixel region with lock/profile/depth checks |
| documents.transaction(documentId, label, callback, expectedRevision?) | Private draft, one undo step; failure rolls back |
| documents.execute(operation, params, documentId?) | Execute a schema-validated editor operation |
| documents.batch(documentId, label, steps, expectedRevision?) | Sequential operations inside one transaction |

`DocumentInfo` includes identity, title, dimensions, revision, mode/depth, selection presence,
selected layer IDs, and flat layer metadata. Capture defaults to the active document and full
visible composite. `selection: true` requires a selection; padding defaults to 64 pixels.
`applyImage` accepts image/name plus captureToken, documentId, expectedRevision, or newDocument.
An image is `{width, height, pixels: Uint8Array}` in straight-alpha sRGB RGBA8.

See [documents and history](documents.md) for depth conversion, selection coverage, and limits.

## Images and files

| Method | Result / contract |
| --- | --- |
| images.encode(image, {maxEdge?, mask?}) | Resized RGBA pixels, dimensions, PNG bytes; no upscaling |
| images.decode(bytes, {width,height}?) | sRGB RGBA8 pixels; optional explicit size mapping |
| files.pick({save?, name?, folder?}) | Canonical granted path or null |
| files.read(path) / write(path, bytes) | Binary file read/write within picker grants |

Mask encoding is `white` for selected-white/unselected-black, or `alpha` for transparent-selected
OpenAI masks. `maxEdge` defaults to 2048, accepts 64–8192; image area is limited to 16 megapixels.
Uploads, downloads, and binary files are limited to 64 MB; original-depth pixel transfers to 256 MB.
