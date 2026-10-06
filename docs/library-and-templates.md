# Prompt Library and Templates

AI Studio uses a custom Photon panel. The Library and Templates buttons sit on one row directly below the prompt field. The borderless bookmark icon at the upper right of the prompt field saves the current prompt to Library. An empty save attempt shows its error directly below the prompt box. Each collection opens an editor-wide modal through the Photon host's `ui.customDialog` capability. The folder sidebar stays on the left and cards stay on the right. Cards flow down independent columns, so a tall card or expanded stack does not leave a gap beneath a shorter card in the next column. The centered Filter Prompts or Filter Templates field in the content toolbar is focused when the dialog opens. It has a bottom hairline and filters live, ignoring case, by card names, prompt or template text, and the displayed prompt date. A stack appears if any version matches and opens to reveal its cards. Escape clears a nonempty filter; filtering does not alter saved cards or order. Drag a card before or after another card to reorder it, onto a folder to move it, or onto an existing stack to join that stack. Expand a stack to reorder its cards by dragging them up or down. While dragging a stacked card, a "Drop here to separate" area appears below the cards; dropping there makes the card independent even when its text is similar. Cards animate to their new positions unless the system requests reduced motion. The host patch required for the editor-wide dialog is documented in [Photon host changes](./photon-host-changes.md).

## Library

Save the current prompt with the icon inside the prompt field. Saved prompts and History have separate tabs in Library. Folder names are entered directly in the sidebar. Card actions use the pen, trash, and magic wand icons from `svg/`; folder rename uses that pen SVG, and the same trash SVG deletes folders and removes an applied template from the prompt. The icons follow Photon skin colors. Edit opens a larger dialog above the Library or Templates dialog. Its toolbar inserts basic Markdown syntax for headings, emphasis, quotes, lists, links, tables, code, and rules. The inline code button reads Code. Images are attached as references rather than inserted as Markdown image links. Save applies the changes; Cancel leaves the card untouched. To delete a folder, prompt, history entry, or template, click its trash glyph twice within two seconds. The first click turns it red; clicking elsewhere or waiting two seconds cancels deletion. Each submitted provider request records the full text sent to the provider, including expanded template context. Similar revisions appear as a stack; expand a stack to edit, delete, reorder, or reuse an earlier version. Use copies a prompt into the visible prompt field and closes Library.

## Templates

A template's text supplies hidden context before the visible prompt. Choosing a
template leaves the prompt field intact and shows the template name and fields
below it. **Template Fields**, to the right of **New Template**, opens a guide
inside the Templates dialog. Valid tags use the Photon accent color in saved
card previews, so they stand apart from ordinary template text. Tags in the
template text define these controls:

```text
{{Subject}}
{{View|select:Front=>front view|Side=>side view}}
{{Light|radio:Softbox=>soft studio light|Window=>window light}}
{{Details|multi:Dew=>dew drops|Leaves=>autumn leaves}}
{{Finishes|multiselect:separator=; :Matte=>matte finish|Gloss=>gloss finish}}
{{Props|check:Add a few props.}}
{{Grain|check:Add fine grain.|Keep the finish clean.}}
```

`Subject` is a free-text field. `View` is a dropdown; `Light` is a visible
single-choice radio group. `Details` shows independent checkboxes and inserts
every selected snippet in the listed order, separated by a comma and space.
`Finishes` opens a compact multi-select dropdown. It inserts every selected
snippet in the listed order, joined by the separator after `separator=`. In
the example, selecting both options inserts `matte finish; gloss finish`.
Use `separator=: ` for a colon and space, `separator=; ` for a semicolon and
space, or another literal separator. Escape a pipe as `\|` when using it as
the separator. Both multi-select controls start empty. `Props` inserts its
snippet only when checked. `Grain` inserts the first snippet when checked and
the second when unchecked; the unchecked snippet is shown below that control.

The word before `|` is the field label. After the control type, each choice
can use `Short label=>prompt text`; omit `=>` when the label and inserted text
are the same. Select and radio default to the first choice. Multiple
checkboxes start empty; a single checkbox starts unchecked. An omitted
unchecked snippet inserts nothing, while an explicit second snippet inserts
that text (including the literal word `none` if written). Repeat a field
name to reuse its value; the first definition of that name supplies its
control. The older `{{style:oil|watercolor|ink}}` dropdown form still works.

Single braces are ordinary text, so JSON such as `{"size":"1024x1024"}`
does not create a field. Only valid `{{...}}` tags become controls. Write
`\{{` for literal double braces. Inside a tag, escape a literal pipe as
`\|`, an arrow as `\=>`, and a closing brace as `\}`. Use `\\` for a literal
backslash. For example, `{{Label|select:A=>red\|blue|B=>green}}` makes a
dropdown whose first choice inserts `red|blue`. An unfinished or invalid
double-brace tag stays as text. Existing saved templates with single-brace
fields are converted once when the library loads; ordinary JSON keys stay
unchanged. Values typed into a field are inserted as written and are not
parsed for more tags.

Template cards and the editor show valid fields as inline pills with a control
icon and field name. The saved text still uses the `{{...}}` syntax above.
Click a pill in the editor to select it. Copy or cut it with the usual keyboard
shortcuts, press Delete or Backspace to remove it, or drag it to move it within
the instructions. Pasting a copied pill restores it as a field. Double-click a
pill, or select it and press Enter, to open its field dialog. The dialog lets
you change the label and the settings for that type. Text fields, checkboxes,
two-state checkboxes, dropdowns, radio groups, multiple checkboxes, and
multi-select dropdowns all have dialogs. For choice controls, edit each
option's label and prompt text, add or remove options, and drag the handle to
reorder them. The handle also supports Alt+Up and Alt+Down. The multi-select
dropdown has a separator field with a live output example. The field toolbar
opens the same dialogs to insert a new pill at the cursor. **Update field**
replaces the selected pill; Cancel keeps the unsaved editor text. Both toolbar
lines use the same button style and scroll horizontally in a narrow dialog.

**To JSON** and **To text** use the selected model to rewrite the text
in the template editor. They are available when that model can return text.
The JSON action requires an object; the narrative action requires valid JSON
input. A response that changes any `{{...}}` field is rejected. The result
stays in the editor until Save, so it can be reviewed or revised. Conversion
does not alter the template's name, references, or transparent-image setting.
The selected model and both actions sit at the right of the Transparent image
row. Known image-only models leave the actions disabled; select a text-capable
model to use them. Codex uses its signed-in account; Gemini and compatible
custom endpoints use the same configured key as image generation.
New Template opens the same editor. Cancel discards a new template without
adding an empty card.

Thirty editable premade cards are installed into All templates once per library.
Their workflows and research sources are in [Premade templates](premade-templates.md).
The Transparent image option has a help glyph. In Generate mode, OpenAI GPT
Image and Codex GPT Image requests ask for transparent PNG output. The Grok
request asks for transparency in its prompt, but xAI does not document an
alpha-output parameter, so a transparent result is not guaranteed. Other
providers are blocked for this option until their transparency capabilities
are checked and implemented.

Templates and manual references can hold PNG, JPEG, or WebP images. The panel converts selected images to bounded JPEG copies (maximum 512 pixels on the longest edge) and shows square cropped thumbnails. On template cards, **＋ Reference** sits at the lower left, with attached icon-sized thumbnails beside it; hovering a thumbnail opens a larger preview. The card action glyphs stay at the lower right. Template references persist with the template; manual references last for the current panel session. Removing a template thumbnail in the panel removes it from that saved template.

Reference images are sent as image inputs with OpenAI, Codex, Gemini, Grok, and X API requests. Other providers reject a request with references before contacting the provider. Reference request shapes for Codex and Grok are based on the current adapters and still require live qualification with an account. Image references may affect provider cost and output.

The Library, including edited templates and resized references, is stored in a separate plugin-owned `config-library.json`. Main `settings.json` holds provider preferences and model cache, not premade templates. The plugin reserves about 650 KB for reference image data and reduces older history when the Library file approaches 940 KB. Each JSON config file still has a 1 MB host limit. Full-resolution references need plugin-scoped binary storage; see [Photon host changes](photon-host-changes.md).
