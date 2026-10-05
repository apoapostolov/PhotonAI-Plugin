# Prompt Library and Templates

AI Studio uses a custom Photon panel. The Library and Templates buttons sit on one row directly below the prompt field. The borderless bookmark icon at the upper right of the prompt field saves the current prompt to Library. Each collection opens an editor-wide modal through the Photon host's `ui.customDialog` capability. The folder sidebar stays on the left and cards stay on the right. Drag a card onto another card to reorder it, or onto a folder to move it. Cards animate to their new positions unless the system requests reduced motion. The host patch required for this capability is documented in [Photon host changes](./photon-host-changes.md).

## Library

Save the current prompt with the icon inside the prompt field. Saved prompts and History have separate tabs in Library. Folder names are entered directly in the sidebar, and deletion is confirmed in the dialog. Each submitted provider request records the full text sent to the provider, including expanded template context. Similar revisions appear as a stack; expand a stack to edit, delete, reorder, or reuse an earlier version. Use copies a prompt into the visible prompt field and closes Library.

## Templates

A template's text supplies hidden context before the visible prompt. Choosing a template leaves the prompt field intact and shows the template name and fields below it. Write `{subject}` for a free-text field or `{style:oil|watercolor|ink}` for a dropdown. The first dropdown option is the default. Reusing a field name uses the same value in each place.

Ten editable premade cards are installed into All templates once per library. Their workflows and research sources are in [Premade templates](premade-templates.md). The Transparent PNG option on a template uses OpenAI's alpha output settings and requires Generate mode with an OpenAI GPT Image model.

Templates and manual references can hold PNG, JPEG, or WebP images. The panel converts selected images to bounded JPEG copies (maximum 512 pixels on the longest edge) and shows square cropped thumbnails. Template references persist with the template; manual references last for the current panel session. Removing a template thumbnail in the panel removes it from that saved template.

Reference images are sent as image inputs with OpenAI, Codex, Gemini, Grok, and X API requests. Other providers reject a request with references before contacting the provider. Reference request shapes for Codex and Grok are based on the current adapters and still require live qualification with an account. Image references may affect provider cost and output.

Photon settings are limited to 1 MB. AI Studio reserves about 650 KB for reference image data and reduces older history when total settings approach 940 KB. For an unbounded collection or full-resolution references, Photon needs plugin-scoped binary storage; see [Photon host changes](photon-host-changes.md).
