# Premade templates

The Template library starts with ten editable cards. Existing libraries
receive them once. The version 2 migration refreshes the text of untouched
starter cards so their new controls appear, while preserving edited or
deleted cards, attached references, folders, and order. The cards live in
All templates so no extra folder appears in the Prompt Library.

## Selection

These are representative Photoshop design tasks, not a measured top-ten usage ranking. The research found no comparable public frequency breakdown for these operations. The set follows Adobe's documented workflows for [Generate Image, Generative Fill, and background replacement](https://helpx.adobe.com/photoshop/desktop/generative-ai/generative-ai-features-overview.html), [product imagery](https://www.adobe.com/products/firefly/discover/ai-generated-backgrounds-for-product-photography.html), [portrait and poster compositing](https://www.adobe.com/learn/photoshop/web/retouching-composite-movie-poster), [adding objects to scenes](https://www.adobe.com/learn/photoshop/web/add-objects-generative-fill), [social layouts and reframing](https://www.adobe.com/learn/photoshop/web/resize-reframe-photo-for-social), [transparent cutouts](https://www.adobe.com/products/photoshop/remove-background.html), and [repeatable patterns](https://helpx.adobe.com/photoshop/using/generate-pattern-using-pattern-maker.html). The ten cards cover common asset, advertising, compositing, and layout work without duplicating the plugin's dedicated Remove command.

| Template | Intended operation | Fields shown under the prompt |
| --- | --- | --- |
| Transparent cutout | Generate a reusable isolated asset | Subject, view, style |
| Product hero photo | Generate an ecommerce or campaign product photo | Product, surface, lighting, angle |
| Lifestyle product scene | Place a product in a believable setting | Product, setting, mood, light |
| Replace background | Fill a selected background around a subject | New setting, mood |
| Add object to scene | Fill a selection with a matched object | Object, material, placement |
| Portrait refinement | Refine a selected portrait detail | Adjustment, finish |
| Poster key art | Generate visual art with space for later typography | Project, subject, genre, palette |
| Social campaign visual | Generate post artwork with copy space | Campaign, audience, format, look |
| Website hero image | Generate a crop-friendly hero with copy space | Brand, subject, copy placement, style |
| Seamless surface pattern | Generate repeatable pattern artwork | Motif, treatment, density, colors |

The refreshed starters demonstrate each control where it fits the task:

- **Dropdown:** Transparent cutout view, product hero surface, poster genre.
- **Radio group:** Transparent cutout style, product hero lighting, social
  format, website copy placement.
- **Multiple checkboxes:** Product hero surface details, lifestyle scene
  details, poster visual cues, social accents.
- **Checkbox with an empty unchecked state:** Product hero styling props,
  background depth haze, object reflections.
- **Checkbox with alternate unchecked text:** Poster film grain selects a
  clean finish when unchecked.

## Transparent output

Transparent cutout enables a saved **Transparent PNG** template option. With Generate mode and an OpenAI GPT Image model, the plugin sends `background=transparent` and `output_format=png` for both generation and image-reference edits. These are the [documented OpenAI image output settings](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output). The plugin decodes the PNG to RGBA pixels for preview and Apply, and encodes PNG for export. The plugin rejects other providers and Fill mode before sending a paid request because their alpha behavior has not been qualified here. The option is editable on any template card.

The template prompts also describe clean edges and no painted checkerboard. Prompt wording alone cannot guarantee transparent pixels; the request option is what asks the provider for alpha.

## Usage

Choose a card with **Use**. Its text fields, dropdowns, radio groups, and
checkboxes appear below the prompt; the template context stays out of the
visible prompt. Enter the specific brief in the prompt itself. The tag
syntax and defaults are in [Prompt Library and Templates](library-and-templates.md).
For Replace background, Add object, or Portrait refinement, switch to Fill
and select the editable region in Photon before generating. Reference images
may be attached to any card; the provider restrictions in that guide still
apply.
