# Earlier panel style and four-skin adaptation

This is a design record for later use. The exact stylesheet used before the
Photon skin conversion is preserved in [panel-style-draft.css](./panel-style-draft.css).
It is **not** loaded by the plugin. The active stylesheet is `src/panel.css`.

## What the earlier style tried

The draft was a compact, dark image-editor panel: small Segoe UI text, dense
controls, a charcoal field and card surface, blue primary action, thin light
borders, muted glyphs, and a centered collection dialog. The collection used
a folder sidebar, card grid, short title bar, subdued history stacks, and
square reference thumbnails. Its fixed colors included `#292a2d` for the
panel, `#1f2023` for fields, `#393a3e` for raised controls, `#526a9c` for the
primary button, and `#e4e5e7` for text. Those choices only suited a dark skin.

## Extend the design across Photon skins

Photon Studio 0.1.42 defines `dark`, `softDark`, `softLight`, and `light` on
`html[data-photon-theme]`. Its custom-panel host passes a subset of computed
`--ph-*` tokens. Keep the density, layout, icon sizes, and card treatment of
the draft, but resolve every color from those host tokens. The active plugin
now applies the host's theme tokens when it opens and when the skin changes.

| Draft role | Photon token | Dark | Soft dark | Soft light | Light |
| --- | --- | --- | --- | --- | --- |
| Panel ground | `--ph-black-3` | `#0d0d0d` | `#2c2c2e` | `#d0d0d4` | `#e2e2e5` |
| Field | `--ph-black-4` | `#111111` | `#303033` | `#d6d6da` | `#e8e8eb` |
| Primary action surface | `--ph-black-7` | `#222222` | `#414144` | `#ededf0` | `#ffffff` |
| Dialog/card | `--ph-black-5` / `--ph-black-6` | `#151515` / `#1b1b1b` | `#343437` / `#3a3a3d` | `#dfdfe3` / `#e6e6ea` | `#f1f1f3` / `#f8f8f9` |
| Main text | `--ph-text` | `#f7f7f7` | `#ededee` | `#17171a` | `#17171a` |
| Secondary text | `--ph-muted` | `#a4a4a4` | `#b4b4b9` | `#484850` | `#4f4f57` |
| Accent | `--ph-accent` | `#ecebe7` | `#ecebe7` | `#26262b` | `#26262b` |
| Hover and selected | `--ph-control-hover` / `--ph-control-active` | light overlay | light overlay | dark overlay | dark overlay |
| Borders | `--ph-stroke` / `--ph-stroke-strong` | light translucent | light translucent | dark translucent | dark translucent |

The old blue button should become `background: var(--ph-black-7)` with
`color: var(--ph-text)`. Photon shares one accent color across both light
skins, so an accent-filled button looks fixed between those two levels.
The draft's pale borders become `--ph-stroke`, and its fixed hover gray
becomes `--ph-control-hover`. Use `--ph-glass-plate`
for the editor backdrop and `--ph-danger` only as an edge marker while keeping
error text on `--ph-text` for light-skin legibility. This preserves the draft's
structure across all four light levels without maintaining four copied CSS
palettes.

The token list comes from the installed 0.1.42
`resources/app.asar` → `dist/assets/index-DOkuVCn1.css` and the custom-panel
theme payload in `dist/assets/PluginPanelRouter-CXkvyysq.js`. Hashed asset
names can change in later Photon versions; inspect the current host before
reusing this draft.
