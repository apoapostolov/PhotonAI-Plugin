# Quickstart

Install the included SDK tarball as a dependency and a browser bundler as a development dependency:

```sh
npm install ./vendor/photon-plugin-sdk-1.0.0.tgz
npm install --save-dev esbuild typescript
```

A plugin needs three local files: `photon.plugin.json`, an HTML entrypoint, and bundled JavaScript.
The manifest selects SDK v1 and declares its panels, commands, and capabilities. See
[manifest reference](manifest.md). Every panel is a persistent isolated runtime, loaded on demand.
Bundle dependencies into the plugin; the runtime does not resolve Node.js or npm modules.

```ts
import {definePlugin} from '@photon/plugin-sdk';

definePlugin(async photon => {
  await photon.ui.render('main', {controls: [
    {type: 'button', id: 'hello', label: 'Hello Photon'}
  ]});
  return photon.ui.onEvent(async event => {
    if (event.id === 'hello') await photon.ui.alert('Hello from a native plugin!');
  });
});
```

Use a plain HTML file loading the bundle with `<script src="plugin.js"></script>`.
Photon injects its SDK bootstrap before this script. Import the built folder through the
plugin manager, enable it, and open its panel. Running the bundle in an ordinary browser
throws `NOT_IN_PHOTON`; mock the SDK for standalone tests.

## Runnable examples

```sh
npm run examples
```

Import one folder under `dist/examples/` at a time:

| Example | Demonstrates |
| --- | --- |
| command | Command activation, a native panel, and an alert |
| panel | Native controls, change events, persisted settings, and cleanup |
| filter | Captured selection, worker pixels, nondestructive placement, and undo |
| provider | A credential reference, authenticated image request, and image decoding |

Use **Reload development folder** after rerunning the build. Installed directories are copied
into immutable versions; changing the source directory alone does not change a running plugin.
