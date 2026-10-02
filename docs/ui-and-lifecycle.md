# Native UI and lifecycle

`ui.render` sends a declarative model to Photon, which renders it using the app's design system.
Your plugin supplies content, state and callbacks; Photon supplies controls, docking, floating
windows, scale, theme, selection menus, command search, keyboard focus and accessibility.
Control IDs remain stable across renders so typed text does not lose focus. Disabled controls
should be checked in handlers too, because an event may already be in transit.

Use tabs for related workflows; settings belong inside the panel or a native dialog. Keep
prompts, results, status and errors in the same surface. Local data-URL image previews avoid
third-party requests from the editor renderer. Panels scroll vertically at narrow widths.

Native modal dialogs return the clicked button's event and a `values` object for entered controls.
Cancel/Escape returns null. Return an activation Disposable to release subscriptions, captures,
and local state when Photon disables, uninstalls, reloads, or shuts down the plugin.

Document notifications arrive as `documentChanged`, with batched changes such as open, close,
select, historyStateChanged, save, and foreground/background set. Fetch metadata again rather
than assuming notification payloads are document snapshots. Theme and visibility events are
also available; never poll the document or scan the installation directory while editing.

## Custom panels

Set a panel's `ui` to `custom` to show its bundled HTML in the existing isolated panel view.
Call `getPhoton()` for SDK access. Native `ui.render` is reserved for native panel declarations.
Use Photon theme tokens (e.g. `--ph-text`, `--ph-muted`, `--ph-accent`, `--ph-black-3`) from the
injected theme. Node/Electron access, arbitrary IPC, external script loading, and direct browser
network access remain unavailable. Route provider calls through `network.request`.

Runtimes load only on invocation/open, survive panel hiding, and are terminated on disable,
replacement, uninstall, or editor shutdown. Different panel entrypoints have independent
runtimes; use persisted settings for durable shared preferences. Commands declare an owning
panel and launch that runtime before delivering their registered callback. A crashed/unresponsive
runtime is disabled with diagnostics; the editor remains open.
