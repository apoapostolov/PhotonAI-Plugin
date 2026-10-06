# Photon host changes for device sign-in

This note is for the Photon team. It describes host changes that Photon AI Studio needs for Codex and Grok device sign-in.

Photon Studio 0.1.41 (`@tenzen/photon`) cannot finish that flow. A local test install of the editor was modified so the plugin could be tried. The plugin package does not contain those edits. Please implement the behavior in Photon and in `@photon/plugin-sdk`.

The local test build changed three files inside `resources/app.asar`:

- `dist-electron/electron/plugins/controller.js`
- `dist/assets/PhotonNativePanel-D_o_1O-3.js`
- `dist/assets/PluginManager-Dru6GY4k.css`

The installed `app.asar.bak` is the original 0.1.42 archive. Electron keeps the archive mapped until Photon Studio is fully quit and opened again.

## What stock 0.1.41–0.1.42 does

Device sign-in needs four host behaviors that 0.1.41 does not provide.

1. OpenAI and xAI token endpoints require `Content-Type: application/x-www-form-urlencoded`. `NetworkRequest` can send `json` or `multipart` only. A multipart token exchange is rejected after the user approves, so the dialog stays on "Waiting for approval…".
2. `ui.dialog` opens one modal and resolves on the first button. A second call throws `Close the current plugin dialog first.` Sending a new dialog through `DialogHost` unmounts the current one, and its cleanup resolves the first promise with `null`. The plugin treats that as Cancel, so the button label cannot change from "Open browser" to "Continue" while the same dialog stays open.
3. A native Photon panel is rendered by the editor. The plugin page is a hidden `WebContentsView` (`setVisible(false)` at creation, and again while `ui` is `native`). With `backgroundThrottling: true`, Chromium freezes timers in that page. The approval poll never runs, so a successful login is never observed.
4. `shell.open` and `clipboard.write` exist for other plugin families. A Photon plugin reaches `Photon plugins must use the SDK capabilities.` before those methods (`controller.js`, `guest()`). The plugin page also has no `window.photon.openExternal`, and `setWindowOpenHandler` denies `window.open`. Copy and "Open browser" have to run in the editor dialog.

OAuth requests also omit `jobId`. `network()` throws `Plugin job is closed.` when `jobId` is set and that job is not in the live job map. Device sign-in is not a `jobs.run` job. That check was left as it is.

## 1. Form request bodies

In `controller.js`, `network()` accepts `p.form` after the multipart branch and before `fetch`:

- Reject the request when a body is already set, when `form` is missing, or when `form` is an array.
- Accept only string values. Reject any other field type.
- Encode with `URLSearchParams` and set `Content-Type` to `application/x-www-form-urlencoded`.

The same size, origin, redirect, and credential checks still apply. `form` is mutually exclusive with `json` and `multipart`.

Suggested SDK addition on `NetworkRequest`:

```text
form?: Record<string, string>
```

The plugin already sends `form` for these calls:

- `POST https://auth.x.ai/oauth2/device/code` with `client_id` and `scope`
- `POST` to the xAI token endpoint with `client_id`, `device_code`, and `grant_type` `urn:ietf:params:oauth:grant-type:device_code`
- `POST https://auth.openai.com/oauth/token` with `grant_type` `authorization_code`, `code`, `code_verifier`, `redirect_uri`, and `client_id`
- Refresh calls to the same token endpoints with `grant_type` `refresh_token`

Codex device start and Codex device poll stay JSON. xAI answers `authorization_pending`, `slow_down`, `access_denied`, and `expired_token`. Codex poll uses HTTP 403 and 404 while the user has not approved yet.

## 2. Update an open native dialog

In `controller.js`, `request()` handles `ui.dialog` like this when `p.update` is set:

- Validate the panel model.
- If a dialog is open, send `plugins:panel-state` again with the same `sdkDialog.id`, the new model, and `update: true`.
- Return `null`. Do not replace `s.dialog` and do not resolve the original promise.
- If no dialog is open, return `null` and do not open one.

The patched `PhotonNativePanel` bundle keeps the mounted dialog in a `dialogWatch` map. A later `sdkDialog` for the same instance calls `setState` on that dialog. It does not call `DialogHost` again, so the original finish callback stays in place. The first resolving button, or unmount, still settles the original `ui.dialog` promise.

The plugin reaches this through the runtime bridge, because public `api.ui.dialog` has no update argument:

```text
__photonPlugin.request("sdk.ui.dialog", { model, update: true })
```

A public method is the right fix. One shape that matches the plugin:

```text
const dialog = api.ui.dialog(model)
dialog.result   // Promise<UiEvent | null>, as today
dialog.update(model)  // replace the open model; do not resolve result
```

`update` after the dialog has closed should resolve without throwing.

## 3. Dialog actions that leave the dialog open

The local editor patch is a sign-in workaround. It special-cases control ids. Please replace it with general control actions. Every plugin dialog should not grow a hidden dependency on the ids `copy`, `open`, `code`, and `codeRow`.

What the test build does in the `PhotonNativePanel` bundle:

- A group whose id is `codeRow` uses the class `photon-native-inline` (a horizontal row).
- A button whose id is `copy` is a borderless 16px clipboard glyph with accessible name "Copy to clipboard". It does not resolve the dialog.
- On first mount, if any control id is `copy`, the input value `code` is copied once. The browser is not opened.
- A button whose id is `open` reads the first top-level `text` control whose text starts with `https://` and calls `window.photon.openExternal`. It does not resolve the dialog.
- Any other button resolves the dialog and closes it, which is the 0.1.41 behavior.
- An empty label is not rendered, so the code field has no extra caption.

`PluginManager-Dru6GY4k.css` adds `.photon-native-inline` and `.photon-copy-glyph`. The glyph uses `--ph-muted` and `--ph-text`.

The dialog the plugin sends today:

- group `codeRow`: input `code` (the user code, empty label) and button `copy`
- text: "Waiting for approval…", "Signed in.", or a danger-tone error
- text: the verification URL
- primary button `open` ("Open browser") until approval, then primary button `continue` ("Continue")
- button `cancel` ("Cancel")

Copy runs when the dialog opens. "Open browser" runs only after that button is clicked. Continue and Cancel close the dialog. Escape still returns `null`.

A durable API can express the same flow without reserved ids. For example, a button can declare an action that does not resolve the dialog:

```text
{ type: "button", id: "copy", action: "copy", target: "code" }
{ type: "button", id: "open", action: "openExternal", target: "verificationUrl" }
{ type: "text", id: "verificationUrl", text: "https://..." }
```

`copy` copies the target control's current value in the editor process. `openExternal` allows only `https:` URLs. Both leave the dialog open. The editor can also copy once when the dialog opens if the model asks for that.

## 4. Keep timers running in a hidden plugin page

In `controller.js`, the plugin `WebContentsView` is created with `backgroundThrottling: false`, and `view.webContents.setBackgroundThrottling(false)` is called immediately after construction.

Native Photon UI keeps that view hidden. The OAuth loop uses timers in the plugin page. With throttling left on, the page never wakes up to see `authorization_pending` clear, and the dialog cannot advance.

Please keep timers alive for a Photon plugin runtime that is hidden because its UI is native. The view can stay invisible.

## 5. Attach an OAuth bearer token

`network()` still rejects an `Authorization` header set by the plugin. Device sign-in receives a bearer token that is not an API key in the password vault. Image calls and model-list calls need that token on later requests.

The plugin sends it as `authorization: "Bearer <token>"` on the network request, separate from `headers`. In `network()`, after the credential block and before the body is built:

- Accept only a string that starts with `Bearer`.
- Reject newlines and values longer than 16 KB.
- Set `headers.Authorization` from that field.

Plugin-set `Authorization`, `cookie`, and API-key headers stay rejected. API keys continue to use a credential reference.

## 6. Remember a device sign-in

`credentials.configure` is the password dialog, and `credentials.status` never returns the saved secret. The plugin cannot put the device-sign-in token back into that slot, and it must not write the token into plugin settings.

Add two host methods that use the same encrypted credential file:

- `credentials.store({id, origin, value})` saves a session string for an origin the plugin already declares. Mark the record `session: true`. Allow up to 64 KB. Do not open a dialog.
- `credentials.read({id})` returns the decrypted string only when that record is a session. Password-dialog API keys stay unreadable.
- `credentials.delete` already removes either record.

The plugin stores `codex-session` for `https://chatgpt.com` and `grok-session` for `https://api.x.ai`. The JSON contains the access token, refresh token, expiry, account id, and token endpoint. On the next launch the plugin reads that record, refreshes it when it is near expiry, and loads the model list. Forget Login deletes the record.

## Still limited

The vault can attach `Authorization`, `x-api-key`, `x-goog-api-key`, and `x-key`. Ideogram's published header is `Api-Key`. The plugin sends the vault key as `x-api-key` because that is a header the host already allows.

On 2026-10-05, the installed 0.1.42 `app.asar` contained `credentials.read` and `credentials.store`; its original `app.asar.bak` did not. After the development folder was reloaded, the registry no longer recorded a `credentials.read` error. The public SDK package still lacks typed methods for these calls, so the plugin uses its bridge. A `credentials.read` error on a running editor means its loaded controller lacks this host patch; fully quit and reopen Photon after replacing an archive.

## What to ship

Ship these behaviors in Photon and the SDK: `form` bodies, an in-place dialog update, dialog actions for copy and open-external that do not close the dialog, unthrottled timers for a hidden native plugin runtime, an `authorization` field on network requests, and encrypted session store/read.

Photon Studio 0.1.42 still needs all of them. Leave the sign-in control ids and the CSS class names as plugin details. A local test install may carry those edits until the product does.

## Library and Templates host work

The 2026-10-06 library interaction changes (inline prompt error, card reference controls, quota placement, and persistent drag grouping) are plugin-side only. They add no new `app.asar` edit. The editor-wide dialog still depends on the `sdk.ui.customDialog` controller patch below, alongside the earlier sign-in patches in this note. The complete upstream PR includes `scripts/patch-photon-host.mjs` and all of these host requirements from the development work in PR #1.

The prompt and template editor now opens a second modal layer inside the
already promoted plugin view. It does not call `sdk.ui.customDialog` a second
time. Markdown and template-field insertion are plugin-side. This adds no
`app.asar` patch beyond the existing full-window view promotion.

Library and Templates need an editor-wide modal. The custom panel cannot draw outside its `WebContentsView`. Photon already implements full-window view promotion for UXP through `panel.dialog`; Photon plugins cannot call that route. The plugin now requests `sdk.ui.customDialog({open: boolean})`, and the host must implement it in `resources/app.asar` → `dist-electron/electron/plugins/controller.js` (`PhotonRuntime.request()`). No hashed renderer asset needs changing.

The host method must accept only a declared custom Photon panel and a Boolean `open`. On open, set `instance.dialogOpen`, move that plugin-owned view to the top of its editor owner's `contentView`, size it to the owner's full content area, and focus it. On close, clear `dialogOpen`, restore `instance.bounds`, and focus the editor. The existing bounds handler already maintains full-window bounds while `dialogOpen` is true. The plugin draws the backdrop and classic folder-sidebar/card-content dialog within this full-window view; the dialog is no longer confined to the dock. The view retains its current plugin identity, broker, theme, and `window.open` restriction.

`scripts/patch-photon-host.mjs` applies this controller change and the plugin-config change below to a copy of an existing archive. Run it with input and distinct output paths. It accepts an archive already carrying the dialog marker, skips that part, and adds the missing config capability. It refuses unknown controller versions and archives already carrying the config marker. Its output must replace `app.asar` only after **all** Photon Studio processes are closed; preserve the existing archive as a backup and reopen Photon. The installed 0.1.42 archive had prior device sign-in edits, so the patch uses that archive rather than the original `app.asar.bak`. A package loaded on a host without these methods reports a missing SDK capability. A real editor visual check is still required after installation.

## Per-plugin configuration files

Main `settings.json` should hold only provider preferences and model cache. The thirty shipped presets come from `config/premade-templates.json` in the plugin package. Editable prompts, history, templates, their references, folders, deletion state, and ordering belong in a separate `config-library.json` under Photon's existing private directory for the plugin. The plugin copies an older Library from `settings.json` into this file before replacing settings without the Library field. A failed first write leaves the old settings copy intact for retry.

Photon Studio 0.1.42 has `this.persistent(i, name)`, `this.json(i, name)`, `this.save(i, name, value)`, and `this.exclusive(i, callback)` in `resources/app.asar` → `dist-electron/electron/plugins/controller.js`. The JSON helper returns `{}` for a missing file and limits each file to 1 MB; save writes a temporary file and renames it. Add two SDK requests in `PhotonRuntime.request()` before the `settings.get` case:

- `config.get({id})` reads `config-<id>.json` through `this.json`.
- `config.set({id, value})` accepts a plain JSON object and writes it through `this.exclusive` and `this.save`.

Use the plugin's existing `i.plugin.key` through `this.persistent`; never accept a path from the plugin. The local qualification patch allows only `library`, `templates`, `history`, and `references` as IDs, giving at most four 1 MB files per plugin. These files are private to that plugin and are removed by the existing per-plugin data cleanup. The first implementation uses only `library`. Add typed `config.get<T>(id)` and `config.set(id, value)` to `@photon/plugin-sdk` for the product release; the current plugin calls the bridge because the vendored SDK has no such methods. Do not use picker-granted `files.read/write` for automatic config storage.

Two limits remain for a production-quality collection:

1. Add a public `ui.customDialog(open)` method to `@photon/plugin-sdk` when shipping the host change. The current plugin uses the bridge directly because the vendored SDK has no such method.
2. The new Library config file still has a 1 MB limit. To keep full-resolution reference files, add plugin-scoped binary storage in the same controller and SDK. A safe shape is `storage.write(id, bytes)`, `storage.read(id)`, and `storage.delete(id)` with path-free, plugin-scoped IDs, a total per-plugin quota, atomic writes, and cleanup on uninstall. Keep Library metadata in its separate config file, migrate image bytes into binary storage, and stop pruning history once it has its own bounded or paged store. The current plugin stores resized references and bounded history in `config-library.json`; it does not call a binary API that stock Photon lacks.

For the product release, rebuild `app.asar` from Photon source instead of string-patching a hashed renderer bundle. The local migration below is a guarded bridge for users of the patched development installation. Quit all Photon Studio processes before archive replacement and relaunch to load the result.

## Moving a local installation to Photon Studio 0.1.43

`scripts/migrate-photon-asar.mjs` carries the reviewed 0.1.42 local changes in the controller, native panel bundle, and panel stylesheet to an **unpatched** 0.1.43 archive. `scripts/photon-0.1.42-patches.json` contains the small, anchored edits between stock 0.1.42 and the local build, including `sdk.config.get/set`. The script locates hashed renderer files by their stable names, checks the target package version, requires a unique match for every edit, and checks the staged JavaScript and archive contents. If an anchor has changed in 0.1.43, it stops before installing and reports the exact file and hunk for a manual port. It never substitutes the full 0.1.42 archive for 0.1.43.

After installing 0.1.43 and fully closing Photon Studio, run from this repository in PowerShell:

```powershell
node scripts/migrate-photon-asar.mjs --target "$env:LOCALAPPDATA\Programs\Photon Studio\resources\app.asar" --expected-version 0.1.43 --install
```

The script stages and verifies `app.asar.photon-ai-staged-<timestamp>`, copies the current plugin data directory to a timestamped backup, moves the original 0.1.43 archive into that backup directory, and installs the patched archive. Omit `--install` to stop after staging and inspect the output; that staging run leaves its archive on disk. The script refuses installation while Photon Studio is running. Use `--data-dir` if Photon's plugin data is somewhere other than `%APPDATA%\Photon Studio\plugins\data`; use `--backup-dir` for a different backup location outside this repository. Plugin settings and credential files stay in their existing private data directory. Reopen Photon Studio and reload the development plugin folder after installation.

The 0.1.42 config patch was installed locally on 2026-10-06. Its prior archive is `resources/app.asar.before-config-2026-10-06`, and the plugin data backup is `%APPDATA%\Photon Studio\plugins\data.before-config-2026-10-06`. The 0.1.43 migration script cannot be qualified against that release until its archive is available.
