# DEVELOPMENT_LOG.md

## Unreleased

### Template authoring help (2026-10-06)

The Templates content toolbar now places Template Fields to the right of New
Template. Its info glyph toggles a concise guide to free-text, dropdown,
radio, multi-checkbox, and two-state checkbox tags. Valid tags in saved
template cards use the Photon accent token; regular template text keeps the
skin's normal text color. Toggling the guide leaves unsaved card edits in
place. Escape closes the guide before it closes the dialog. This is a plugin
UI change and requires no additional Photon `app.asar` patch.

### Template field taxonomy (2026-10-06)

Typed template tags now support dropdowns, visible single-choice radio
groups, multiple-choice checkbox groups, and single checkboxes with an
optional alternate unchecked snippet. Short option labels can map to longer
prompt text. Existing free-text and colon-separated dropdown tags continue
to work. Unselected multi-choice fields and checkboxes with no unchecked
snippet insert no text. Ten premade templates use the controls where they
fit the design task. The version 2 seed updates untouched starter text but
keeps edited and deleted cards, references, folders, and order. The template
syntax is documented in `docs/library-and-templates.md`. No new `app.asar`
patch is required; controls are rendered by the plugin's custom panel.

### Card action icons (2026-10-06)

Library, History, and Templates cards now use the pen, trash, and magic wand
SVGs from `svg/` for Edit, Delete, and Use. The edit control still changes to
a checkmark when saving. SVG markup is bundled into the panel script, so the
installed plugin needs no separate icon files or new Photon host patch. CSS
uses `currentColor` and existing Photon skin tokens, including the red
two-click delete state. Font Awesome attribution ships in
`THIRD_PARTY_NOTICES.txt` with the plugin package.
The Use icon shares the same muted grey and hover color as Edit and Delete.

### Library interaction follow-up (2026-10-06)

The empty Save prompt message now appears immediately below the prompt box
and clears when the prompt changes. Signed-in Codex and Grok quota text sits
at the right of the Model label when there is no error, saving one panel row.
Template cards now place ＋ Reference and icon-sized image thumbnails at the
lower left, opposite the action glyphs. Hovering a thumbnail reveals a larger
preview.

Prompt, history, and template cards can be dragged to reorder, grouped by
dropping onto a stack, separated with the drop area shown during a stacked
drag, and reordered inside an expanded stack. Explicit stack choices persist
in library settings alongside the existing fuzzy grouping for untouched
cards. No Photon host archive change is needed for these interactions; the
existing `sdk.ui.customDialog` patch remains required.

### Library and Templates

Library and Template card actions now use a font trash glyph for Delete and
a font sparkles glyph for Use. Edit keeps its existing pencil glyph. The
prompt-save bookmark and applied-template trash also use font glyphs. The
monochrome characters use Windows Segoe UI Symbol and inherit Photon's skin
text colors. The installed Photon archive has no bundled icon font; its
existing Inter font does not contain these symbols.

Card and folder deletion now use the trash glyph itself for confirmation:
the first click arms it with Photon's danger color for two seconds, and a
second click on that same glyph deletes the item. Clicking elsewhere,
pressing Escape, starting a drag, or the timeout disarms it. This removes
the delete-confirmation buttons above the collection content.
TypeScript typecheck and package build passed. Photon Studio reloaded the
development folder at 20:42 local time; installed JavaScript and CSS hashes
match `dist/plugin`, with zero registry issues and diagnostics. The timing
and red state still need a direct visual check inside the editor.

AI Studio now builds as a custom Photon panel. Library and Templates buttons sit beneath the visible prompt on one row. Their editor-wide modal uses a classic two-column layout: folder sidebar on the left, cards on the right. The dialog has a compact title bar without a subtitle or decorative header. Cards support editing, deletion, drag ordering, and stacks of similar text. History records submitted prompts, including expanded template context. Templates supply hidden context alongside the visible prompt; `{name}` and `{name:one|two|three}` produce controls beneath it. Attached and manual image references appear as cropped square thumbnails and are sent to supported image adapters.

The dialog now asks the host for `sdk.ui.customDialog`, which promotes the plugin view above the full editor. The patched 0.1.42 archive is installed as `resources/app.asar`; the previous archive is preserved as `resources/app.asar.before-modal`. The source patch is in `scripts/patch-photon-host.mjs`, with the required behavior in `docs/photon-host-changes.md`. Unbounded binary storage still needs a separate Photon host/SDK change. Current reference images are resized and stored under a 650 KB budget inside Photon's 1 MB settings limit; oldest history is pruned as settings approach 940 KB. Reference request shapes for Codex and Grok still need live account qualification.

Verification on 2026-10-05: TypeScript typecheck, build, packaging, and documentation checks passed after the editor-wide modal change. Earlier, 85 tests passed. Photon Studio reloaded the development folder and its registry records the custom panel entrypoint. The patched archive passed a JavaScript syntax check and Photon Studio restarted with it at 19:48 local time. Prior registry diagnostics recorded `Unsupported Photon SDK capability: ui.customDialog` before restart; no dialog interaction has been observed after restart. The full-window appearance is pending a Photon Studio visual check. The earlier browser preview was not a Photon Studio screenshot and is not evidence of in-editor appearance.

The installed `app.asar` contains `credentials.read` and `credentials.store`; `app.asar.bak` does not. The current registry has no `credentials.read` diagnostic after the development folder reload. An editor session using the old archive still needs a full restart to pick up host changes.

The prompt field now has a borderless save icon in its upper right corner.
It saves the visible prompt directly to Library's All prompts folder.
The Library dialog no longer has a Save current prompt button.
The All prompts sidebar row no longer stretches to fill the sidebar height;
folder rows retain their normal line height.
TypeScript typecheck and package build passed after these adjustments.
Photon Studio loaded this build from the development folder.

After that reload, Photon reported `prompt() is not supported` when folder
controls were used. Folder creation and rename now use inline sidebar inputs;
folder and card deletion use confirmation controls in the collection dialog.
Reference errors also render inside the plugin instead of calling browser
alerts. The applied template's Remove action is now a right-aligned trash
glyph in its card header. TypeScript typecheck and package build passed for
this follow-up. Photon Studio reloaded the replacement at 19:59 local time;
the installed bundle contains the save icon, inline folder controls, template
trash glyph, and `sdk.ui.customDialog` request. Registry diagnostics were
empty after that reload. A visual check in Photon Studio remains separate;
no browser preview is presented as an editor screenshot.

### Photon skin colors

The active custom panel now receives Photon's theme payload and applies its
`--ph-*` CSS tokens at startup and whenever the editor changes skin. All
hard-coded interface colors and local color aliases were removed from
`src/panel.css`; the same rules now follow dark, soft dark, soft light, and
light. The previous visual attempt is preserved exactly in
`docs/panel-style-draft.css`, with its four-skin adaptation documented in
`docs/panel-style-draft.md` for later use.

Verification on 2026-10-05: typecheck, package build, documentation checks,
and diff whitespace check passed. The active stylesheet has no hex/RGB
colors or local color aliases; every used `--ph-*` token is present in the
custom-panel theme payload of the installed Photon host. Photon reloaded the
development folder at 20:11 local time. Its installed bundle contains theme
request and change handling, the installed CSS has no fixed colors, and the
plugin registry reports no diagnostics. Visual appearance in all four skins
has not yet been inspected in Photon Studio.

Photon's 0.1.42 skin CSS gives `light` and `softLight` the same `--ph-accent`,
so Generate Image and Apply retained the same filled color across those
skins. Primary actions now use `--ph-black-7` for the surface, `--ph-text`
for the label, and `--ph-stroke-strong` for the border. Those surfaces differ
in all four skins. The earlier blue fill remains only in the archived
stylesheet.
Typecheck, package build, and documentation checks passed for this fix.
Photon reloaded the development folder at 20:16 local time; the installed
stylesheet contains the skin-specific primary action rules and the plugin
registry reports no diagnostics. Appearance still needs a direct visual
check in the editor.

Keep provider keys and device sessions in Photon's credential vault. Do not place them in library or template records.

### Premade Template library cards (2026-10-05)

Added ten editable templates for transparent cutouts, studio product imagery,
lifestyle product scenes, background replacement, scene objects, portrait
refinement, poster art, social campaigns, website heroes, and seamless surface
patterns. Each card demonstrates named free-text fields and dropdowns. The
research basis, template list, and the absence of a measured usage ranking are
documented in `docs/premade-templates.md`.

The library now stores a template seed version. It installs missing premade
cards once for existing or new libraries, then respects edits and deletion.
Transparent PNG is a template-level option. On OpenAI GPT Image Generate
requests, the adapter sends `background=transparent` and `output_format=png`;
other provider/mode combinations stop before a request. This change requires
no additional Photon `app.asar` patch beyond the custom-dialog capability
already documented for the Template library.

TypeScript typecheck and package build passed. Photon Studio reloaded the
final development folder at 20:28 local time; its installed `plugin.js`
matches `dist/plugin/plugin.js`, and the registry shows zero issues and zero
diagnostics. A live alpha output from an OpenAI account and the appearance of
all ten cards inside Photon Studio are not yet verified visually.

### Provider output options

Output size and Quality fill from each provider's published options when the user signs in, and again when a signed-in provider loads or is selected again.

| Provider | Output size | Quality |
| --- | --- | --- |
| OpenAI and Codex GPT Image 2.5 | Auto, plus the published sizes through 3840×2160 | Auto, Low, Medium, High, Extra high, Max |
| GPT Image 2 | Same sizes | Auto, Low, Medium, High |
| GPT Image 1 and ChatGPT Image | 1024×1024, 1536×1024, 1024×1536 | Auto, Low, Medium, High |
| Codex chat models that only accept images | Menu hidden | Menu hidden |
| Gemini 3.1 Flash Image | Aspect ratios, including 1:4, 4:1, 1:8, and 8:1 | 1K, 2K, 4K, 512 |
| Gemini 3 Pro Image | Standard aspect ratios | 1K, 2K, 4K |
| Gemini 3.1 Flash Lite Image | Standard aspect ratios | 1K |
| Gemini 2.5 Flash Image | Its fixed pixel sizes | Menu hidden |
| Grok Imagine 2.0 and X API | Aspect ratios, including 21:9 and 5:2 | Auto, Low, Medium, also at 1.5K and 2K |
| Grok Imagine | Aspect ratios except 21:9 and 5:2 | 1K, 2K |
| Ideogram 4.5 | Auto and the published 1K and 2K presets | High, Medium, Low, Very low |
| Black Forest Labs FLUX.2 | Width and height presets up to 2048×2048 | Menu hidden |
| fal FLUX Dev | The six official size presets | Menu hidden |
| Replicate FLUX Dev | 1:1, 16:9, 21:9, 3:2, 2:3, 4:5, 5:4, 3:4, 4:3, 9:16, 9:21 | Menu hidden |
| Together FLUX.2 | 1024×1024, 1344×768, 768×1344 | Menu hidden |
| Midjourney | 1024×1024, 1536×1024, 1024×1536 | Menu hidden |
| Custom | The sizes and qualities you type | The sizes and qualities you type |

Very low on Ideogram is sent only for an edit. Midjourney still does not call an image API. Host changes required before these flows run on stock Photon are in [Photon host changes](https://github.com/apoapostolov/PhotonAI-Plugin/blob/development/docs/photon-host-changes.md).
