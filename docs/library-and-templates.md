# Prompt Library and Templates

AI Studio uses a custom Photon panel. The Library and Templates buttons sit on one row directly below the prompt field. The borderless bookmark icon at the upper right of the prompt field saves the current prompt to Library. An empty save attempt shows its error directly below the prompt box. Each collection opens an editor-wide modal through the Photon host's `ui.customDialog` capability. The folder sidebar stays on the left and cards stay on the right. Drag a card before or after another card to reorder it, onto a folder to move it, or onto an existing stack to join that stack. Expand a stack to reorder its cards by dragging them up or down. While dragging a stacked card, a "Drop here to separate" area appears below the cards; dropping there makes the card independent even when its text is similar. Cards animate to their new positions unless the system requests reduced motion. The host patch required for the editor-wide dialog is documented in [Photon host changes](./photon-host-changes.md).

## Library

Save the current prompt with the icon inside the prompt field. Saved prompts and History have separate tabs in Library. Folder names are entered directly in the sidebar. Card actions use the pen, trash, and magic wand icons from `svg/`; the icons follow Photon skin colors. The edit action changes to a checkmark while saving. To delete a folder, prompt, history entry, or template, click its trash glyph twice within two seconds. The first click turns it red; clicking elsewhere or waiting two seconds cancels deletion. Each submitted provider request records the full text sent to the provider, including expanded template context. Similar revisions appear as a stack; expand a stack to edit, delete, reorder, or reuse an earlier version. Use copies a prompt into the visible prompt field and closes Library.

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
{{Props|check:Add a few props.}}
{{Grain|check:Add fine grain.|Keep the finish clean.}}
```

`Subject` is a free-text field. `View` is a dropdown; `Light` is a visible
single-choice radio group. `Details` shows independent checkboxes and inserts
every selected snippet in the listed order. `Props` inserts its snippet only
when checked. `Grain` inserts the first snippet when checked and the second
when unchecked; the unchecked snippet is shown below that control.

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

Ten editable premade cards are installed into All templates once per library. Their workflows and research sources are in [Premade templates](premade-templates.md). The Transparent PNG option on a template uses OpenAI's alpha output settings and requires Generate mode with an OpenAI GPT Image model.

Templates and manual references can hold PNG, JPEG, or WebP images. The panel converts selected images to bounded JPEG copies (maximum 512 pixels on the longest edge) and shows square cropped thumbnails. On template cards, **＋ Reference** sits at the lower left, with attached icon-sized thumbnails beside it; hovering a thumbnail opens a larger preview. The card action glyphs stay at the lower right. Template references persist with the template; manual references last for the current panel session. Removing a template thumbnail in the panel removes it from that saved template.

Reference images are sent as image inputs with OpenAI, Codex, Gemini, Grok, and X API requests. Other providers reject a request with references before contacting the provider. Reference request shapes for Codex and Grok are based on the current adapters and still require live qualification with an account. Image references may affect provider cost and output.

Photon settings are limited to 1 MB. AI Studio reserves about 650 KB for reference image data and reduces older history when total settings approach 940 KB. For an unbounded collection or full-resolution references, Photon needs plugin-scoped binary storage; see [Photon host changes](photon-host-changes.md).
