# Photon host changes for device sign-in

This note is for the Photon team. It describes host changes that Photon AI Studio needs for Codex and Grok device sign-in.

Photon Studio 0.1.41 (`@tenzen/photon`) cannot finish that flow. A local test install of the editor was modified so the plugin could be tried. The plugin package does not contain those edits, and this repository does not patch Photon. Please implement the behavior in Photon and in `@photon/plugin-sdk`.

The local test build changed three files inside `resources/app.asar`:

- `dist-electron/electron/plugins/controller.js`
- `dist/assets/PhotonNativePanel-B38Fm8oZ.js`
- `dist/assets/PluginManager-Dru6GY4k.css`

`app.asar.bak` in that install is the original 0.1.41 archive. Electron keeps the archive mapped until Photon Studio is fully quit and opened again.

## What stock 0.1.41 does

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

`PhotonNativePanel-B38Fm8oZ.js` keeps the mounted dialog in a `dialogWatch` map. A later `sdkDialog` for the same instance calls `setState` on that dialog. It does not call `DialogHost` again, so the original finish callback stays in place. The first resolving button, or unmount, still settles the original `ui.dialog` promise.

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

What the test build does in `PhotonNativePanel-B38Fm8oZ.js`:

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

- Accept only a string that starts with `Bearer `.
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

## What to ship

Ship these behaviors in Photon and the SDK: `form` bodies, an in-place dialog update, dialog actions for copy and open-external that do not close the dialog, unthrottled timers for a hidden native plugin runtime, an `authorization` field on network requests, and encrypted session store/read.

Photon Studio 0.1.42 still needs all of them. Leave the sign-in control ids and the CSS class names as plugin details. A local test install may carry those edits until the product does. This plugin does not patch Photon.
