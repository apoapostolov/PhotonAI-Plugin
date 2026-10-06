# Premade templates

The 30 shipped definitions live in `config/premade-templates.json`, which is
copied into the plugin package. The plugin bundles that file for startup and
stores editable Library state in its own per-plugin config file; main
`settings.json` does not hold the premade cards.

The Template library starts with 30 editable cards. Version 3 adds the 20 new
cards to existing libraries and appends them after the current order. It does
not restore deleted older starters or overwrite edited cards. Version 2
refreshed the text of untouched original cards for typed controls. A separate
syntax migration changes saved single-brace fields to double braces once.
The cards live in All templates so no extra folder appears in the Prompt
Library.

## Selection

These are representative Photoshop design tasks, not a measured top-30 usage
ranking. No comparable public frequency breakdown was found. The original
ten cover [image generation, fill, and background work](https://helpx.adobe.com/photoshop/desktop/generative-ai/generative-ai-features-overview.html),
[product imagery](https://www.adobe.com/products/firefly/discover/ai-generated-backgrounds-for-product-photography.html),
[portrait and poster compositing](https://www.adobe.com/learn/photoshop/web/retouching-composite-movie-poster),
[social layouts](https://www.adobe.com/learn/photoshop/web/resize-reframe-photo-for-social),
[transparent cutouts](https://www.adobe.com/products/photoshop/remove-background.html),
and [repeatable patterns](https://helpx.adobe.com/photoshop/using/generate-pattern-using-pattern-maker.html).

The next twenty address deliverables and edit operations those ten missed.
Adobe demonstrates [album art with generated assets](https://www.adobe.com/learn/photoshop/web/design-workflow-with-generate-image),
[book-cover layout](https://www.adobe.com/learn/photoshop/web/add-color-fill-layers),
[magazine covers](https://www.adobe.com/uk/learn/photoshop/web/the-unlock-the-joyful-rebellion-of-nicole-jacek),
[event flyers](https://www.adobe.com/de/learn/photoshop/web/make-a-flyer),
[video thumbnails](https://www.adobe.com/learn/photoshop/web/youtube-thumbnail-template),
and [web, email, and ad banners](https://www.adobe.com/learn/photoshop/web/make-banner).
Other Adobe workflows support [packaging presentations](https://blog.adobe.com/en/publish/2018/01/19/creating-perfect-product-packaging-adobe-dimension),
[food photography](https://blog.adobe.com/en/publish/2021/11/30/macro-food-photography),
[interior concepts](https://www.adobe.com/learn/photoshop/web/room-makeover-with-generative-ai),
[stickers](https://www.adobe.com/learn/photoshop/web/create-sticker-photoshop-web),
[sky replacement](https://helpx.adobe.com/in/photoshop/desktop/effects-filters/artistic-stylize-filters/replace-the-sky-in-images.html),
[canvas expansion](https://helpx.adobe.com/photoshop/web/edit-images/retouch/expand-images-with-generative-ai.html),
[photo colorization](https://helpx.adobe.com/photoshop/desktop/quick-actions/colorize-old-photographs.html),
and [double exposure](https://www.adobe.com/creativecloud/photography/discover/double-exposure-effect.html).
The apparel, travel, brand, and campaign cards apply the same image and layout
techniques to adjacent design briefs; that coverage is an editorial choice,
not a claim that Adobe ranks those tasks by frequency. Text, logos, and
production print marks remain editable work for Photon or another design tool.

| Template | Use | Main editable fields |
| --- | --- | --- |
| Transparent cutout | Generate isolated asset | Subject, view, style |
| Product hero photo | Generate studio product image | Product, surface, lighting, angle |
| Lifestyle product scene | Generate product in setting | Product, setting, mood, light |
| Replace background | Fill selected background | New setting, mood |
| Add object to scene | Fill selected area with object | Object, material, placement |
| Portrait refinement | Fill selected portrait detail | Adjustment, finish |
| Poster key art | Generate poster visual | Project, subject, genre, palette |
| Social campaign visual | Generate social artwork | Campaign, audience, format, look |
| Website hero image | Generate crop-friendly hero | Brand, subject, copy placement, style |
| Seamless surface pattern | Generate repeatable pattern | Motif, treatment, density, colors |
| Book cover artwork | Generate front-cover art | Theme, genre, motif, mood |
| Album cover artwork | Generate square music artwork | Concept, motif, genre, treatment |
| Magazine cover portrait | Generate editorial cover photo | Subject, theme, lighting, palette |
| Event flyer visual | Generate event artwork | Event, theme, motif, energy |
| Greeting card illustration | Generate card-front art | Occasion, motif, style, palette |
| Video thumbnail visual | Generate small-screen hook | Topic, hook, tone, copy area |
| Display ad visual | Generate ad image layer | Offer subject, audience, format, placement |
| Email campaign header | Generate shallow header crop | Campaign, subject, season, mood |
| Packaging presentation | Generate physical package mockup | Package, material, setting, view |
| Food menu photography | Generate dish image | Dish, cuisine, camera, light |
| Fashion editorial scene | Generate garment-led image | Garment, setting, mood, light |
| Interior staging concept | Generate or fill room concept | Room, style, palette, furnishings |
| Travel campaign image | Generate destination visual | Destination, feature, season, treatment |
| Apparel print graphic | Generate flat print motif | Motif, style, ink plan, wear |
| Sticker sheet artwork | Generate separated sticker motifs | Theme, count, style, border |
| Brand moodboard | Generate visual direction board | Brand, audience, values, palette |
| Sky replacement | Fill selected sky | Sky, time, cloud detail |
| Extend image canvas | Fill selected empty canvas | Direction, environment cues, copy space |
| Archival photo colorization | Fill selected photo area | Era, palette reference, treatment, repair |
| Double exposure composite | Generate layered image concept | Subjects, blend, tone, accents |

The starters demonstrate each control where it fits the task:

- **Dropdown:** Transparent cutout view, product hero surface, poster genre.
- **Radio group:** Transparent cutout style, product hero lighting, social
  format, website copy placement.
- **Multiple checkboxes:** Product hero surface details, lifestyle scene
  details, poster visual cues, social accents.
- **Checkbox with an empty unchecked state:** Product hero styling props,
  background depth haze, object reflections.
- **Checkbox with alternate unchecked text:** Poster film grain selects a
  clean finish when unchecked; apparel wear and sticker borders do likewise.

## Transparent output

Transparent cutout enables a saved **Transparent image** template option. In
Generate mode, OpenAI GPT Image and Codex GPT Image requests send
`background=transparent` and `output_format=png`, based on the
[documented OpenAI image output settings](https://developers.openai.com/api/docs/guides/image-generation#customize-image-output).
Codex uses a separate image route, so its exact request shape still needs
live account qualification. Grok requests add a transparent-alpha instruction
to the prompt; [xAI image generation documentation](https://docs.x.ai/developers/model-capabilities/images/generation)
does not specify a transparent-background parameter or guarantee an alpha
channel. The plugin decodes returned image bytes to RGBA pixels for preview
and Apply, then encodes PNG for export. Fill mode and other providers are
blocked for this option. The option is editable on any template card.

The template prompts also describe clean edges and no painted checkerboard. Prompt wording alone cannot guarantee transparent pixels; the request option is what asks the provider for alpha.

## Usage

Choose a card with **Use**. Its text fields, dropdowns, radio groups, and
checkboxes appear below the prompt; the template context stays out of the
visible prompt. Enter the specific brief in the prompt itself. The tag
syntax and defaults are in [Prompt Library and Templates](library-and-templates.md).
For Replace background, Add object, Portrait refinement, Sky replacement,
Extend image canvas, or Archival photo colorization, switch to Fill and select
the editable region in Photon before generating. Interior staging can start
with a room reference in Generate mode or a selected region in Fill mode.
The plugin sends one image request per use; a sticker sheet or moodboard is
one composed image, not separate editable objects. Reference images may be
attached to any card; the provider restrictions in that guide still apply.
