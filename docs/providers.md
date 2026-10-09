# Provider setup and adapter authoring

Create an API key in the provider's dashboard, ensure its account has image access/credits,
select that provider in AI Studio, then Connect provider. This plugin uses API billing, which
may be separate from a consumer chat subscription. It never submits a generation automatically
when a key, provider or model changes.

| Provider | API / auth | Generation | Editing |
| --- | --- | --- | --- |
| OpenAI | Images API; Bearer | GPT Image profiles | Multipart source and transparent-alpha mask; high input fidelity on GPT Image 1/1.5 |
| Codex | ChatGPT device sign-in, then `images/generations` and `images/edits`; Bearer | GPT Image Flare and Sunburst | Source first, selection guide second; prompt-based |
| Gemini | generateContent; x-goog-api-key | Flash Image | Source plus white-mask reference, prompt-based |
| Midjourney | No official image API | — | — |
| Ideogram | `x-api-key` | Ideogram 4.5 | Precise edit; black mask marks the area to change |
| Black Forest Labs | asynchronous API; x-key | FLUX.2 Pro | FLUX Pro Fill mask, or FLUX.2 prompt/reference edit |
| fal.ai | queue; Authorization: Key | FLUX Dev | FLUX Pro Fill source + white mask |
| Replicate | model predictions; Bearer | FLUX Dev | FLUX Fill Pro source + white mask |
| Together AI | images/generations; Bearer | FLUX.2 | FLUX.2 Pro reference images, prompt-based |
| X API | `https://api.x.ai` images; Bearer API key | Grok Imagine 2.0 and Grok Imagine | Source first, selection guide second; prompt-based |
| Grok | xAI device sign-in or API key; Bearer | Grok Imagine 2.0 and Grok Imagine | Source first, selection guide second; prompt-based |
| Custom | compatible Images API; Bearer | User-supplied model | Optional compatible multipart mask endpoint |

In Edit, the **Edit Prompts** folder supplies editable Add, Change, and
Replace instructions. The current defaults identify what to add, change, or
replace, name what must remain in the source, and treat extra references as
guides for the requested edit. A previous unmodified default is upgraded when
the library loads; customized instructions remain unchanged. Prompt-only
adapters add a separate source-and-selection-guide instruction at request time.

OpenAI sends the source image first and a transparent-alpha mask through
`/images/edits`. Transparent mask pixels mark the area to edit. GPT Image
1/1.5 requests set `input_fidelity=high`; GPT Image 2 and 2.5 omit it because
the current API does not list that control for those models. The Edit model
list puts Sunburst first and marks it **Precise**, with Flare marked **Fast**.
The source and mask are encoded at the same dimensions before submission.
A native mask guides generation; the model can still alter pixels in its
preview. Photon limits the applied layer to the original selection.

Codex's current ChatGPT image route and Grok/X API's JSON edit route do not
expose a native mask parameter here. They receive the source as the first
image and a white-area selection guide as the second, plus a prompt explaining
their roles. Their preview may drift outside the requested area; Photon clips
Apply to the original selection. Grok/X API accept at most five edit images,
so an edit has room for three further references after the source and guide.
With Output size on **Auto**, the request omits an aspect-ratio override so
Grok follows the first source image. These are one-shot edits; the plugin does
not claim multi-turn image continuity or pixel-identical output.

The bundled catalog is the fallback list. After a successful Codex or Grok sign-in, and after
an API key is saved for OpenAI, Gemini, Together, X API, Grok, or a custom OpenAI-compatible
endpoint, AI Studio loads that account's image models into the model dropdown. The list is
cached in plugin settings for one day and then loaded again, so a model released by the
provider can appear without a plugin update. The cache stores model ids and labels only.
Access tokens, refresh tokens, and API keys are not written into it. If the account list
cannot be loaded, the provider error is shown and the previous cache or the bundled catalog stays in the dropdown.
A ChatGPT sign-in reads the account model catalog. The dropdown then lists the visible models that accept or produce images, using the account's own names. A sign-in is not sent to the OpenAI model list, because that list requires the `api.model.read` scope. The bundled models remain only until the account list is saved.

For signed-in Codex and Grok sessions, available quota appears right-aligned beside the Model label. An error remains on its own line and does not replace the Model label.

OpenAI, Codex, and custom endpoints use their model list and keep GPT Image and DALL·E ids.
Codex reads the ChatGPT model catalog. An API key for Codex can also read the OpenAI model list. Grok and X API use
`GET https://api.x.ai/v1/image-generation-models`. Gemini keeps image-generation model ids
from `v1beta/models`. Together keeps models whose type is `image`. Ideogram, Black Forest
Labs, fal.ai, Replicate, and Midjourney keep the bundled catalog. The Output size and Quality menus are filled from the sizes and quality values each
provider publishes for that model. This happens when the account model list loads
after sign-in or when a saved sign-in is restored, and again when that provider is
selected. A saved list from an earlier version picks up the current choices on the
next panel load. A model that can accept an image but does not generate one, such
as a Codex chat model, leaves both menus empty. Midjourney has no official image
API, so it has no quality menu and its size menu is not sent anywhere. Custom
endpoints keep the sizes and qualities entered in the panel. The API keys remain
provider-specific.

Codex and Grok sign-in follows the public device-code flows: Codex uses OpenAI device authorization and then the ChatGPT Codex image routes; Grok uses the xAI device endpoint and rewrites the browser page to `accounts.x.ai`. X API uses the same Grok Imagine models with an xAI API key and does not open a sign-in dialog. The sign-in dialog shows the user code and verification page. Status lines are `Requesting a sign-in code…`, `Waiting for approval…`, and `Signed in.` The access token, refresh token, and device secret are not written into those lines. Cancel clears the attempt. A signed-in session is stored by Photon for the next launch and refreshed shortly before it expires. The access token, refresh token, and device secret are not written into plugin settings.

Stock Photon Studio 0.1.41 cannot finish that dialog. The required editor and SDK changes are in [Photon host changes](photon-host-changes.md), for the Photon team. This plugin does not patch Photon.

Ideogram's published header is `Api-Key`. This plugin stores the key in Photon's credential vault and sends it as `x-api-key`, which is a header that vault can attach. The precise-edit mask uses black for the selected region and white for the region to keep.

Midjourney publishes prompts and version parameters for its app. It does not publish an image generation endpoint, so AI Studio does not send Midjourney requests.

## Custom endpoints

Enter the full API base (e.g. `https://your-host.example/v1`), model ID, and whether masked edits
are supported. Set supported sizes, quality values and the maximum reference-image edge to match
your endpoint; leave size/quality lists blank to omit those request fields. Connect provider requests Photon approval for that origin, then stores its key.
Generation calls `images/generations`; edits call `images/edits`. Other protocols require an adapter.

## Add an adapter

Implement `Adapter.run(context, request): Promise<Uint8Array>` in `src/providers/`. Context
contains PhotonApi, JobContext, and a credential ID. Request contains provider/model/mode,
prompt, supported options and optional encoded source/masks. Keep submission, polling and
output parsing inside the adapter; the panel owns capture, preview, Apply and undo.

Use the shared request helper for status handling and cancellation. Return image bytes,
not an external URL. Output downloads never carry provider credentials. For queued jobs,
submit once, poll returned URLs, detect terminal failure/refusal, and attempt remote cancellation
where the API supports it. Give removal the reconstruction prompt; use the user's fill prompt.

Add the adapter export, catalog capabilities, required origins/auth aliases, mocked tests,
and documented setup. See `examples/provider.ts`. Test malformed responses, no-image responses,
401/403, 429, refused jobs, output downloads, queue completion and cancellation.

## Official references used for implementation

- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI image edit API](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting)
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Together image generation](https://docs.together.ai/docs/inference/images/overview)
- [Together reference images](https://docs.together.ai/docs/inference/images/reference-images)
- [fal FLUX Pro Fill API](https://fal.ai/models/fal-ai/flux-pro/v1/fill/api)
- [Replicate predictions](https://replicate.com/docs/topics/predictions/create-a-prediction)
- [BFL generation/polling](https://docs.bfl.ai/quick_start/generating_images)
- [BFL image editing](https://docs.bfl.ai/flux_2/flux2_image_editing)
- [xAI image generation](https://docs.x.ai/docs/guides/image-generations)
- [xAI image editing](https://docs.x.ai/developers/model-capabilities/images/editing)
- [xAI multi-image editing](https://docs.x.ai/developers/model-capabilities/images/multi-image-editing)
- [Ideogram 4.5 generate](https://developer.ideogram.ai/api-reference/images/generate/ideogram-4-5)
- [Ideogram 4.5 precise edit](https://developer.ideogram.ai/api-reference/images/precise-edit/ideogram-4-5)
