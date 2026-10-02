# Provider setup and adapter authoring

Create an API key in the provider's dashboard, ensure its account has image access/credits,
select that provider in AI Studio, then Connect provider. This plugin uses API billing, which
may be separate from a consumer chat subscription. It never submits a generation automatically
when a key, provider or model changes.

| Provider | API / auth | Generation | Editing |
| --- | --- | --- | --- |
| OpenAI | Images API; Bearer | GPT Image profiles | Multipart source and transparent-alpha mask |
| Gemini | generateContent; x-goog-api-key | Flash Image | Source plus white-mask reference, prompt-based |
| Together AI | images/generations; Bearer | FLUX.2 | FLUX.2 Pro reference images, prompt-based |
| fal.ai | queue; Authorization: Key | FLUX Dev | FLUX Pro Fill source + white mask |
| Replicate | model predictions; Bearer | FLUX Dev | FLUX Fill Pro source + white mask |
| Black Forest Labs | asynchronous API; x-key | FLUX.2 Pro | FLUX Pro Fill mask, or FLUX.2 prompt/reference edit |
| Custom | compatible Images API; Bearer | User-supplied model | Optional compatible multipart mask endpoint |

The bundled versioned catalog selects models by supported operation; it does not treat every
provider model as image-capable. Actual account availability can differ. Update catalog entries
against official API documentation when changing models. The panel shows only supported
size/quality controls. The API keys remain provider-specific.

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
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Together image generation](https://docs.together.ai/docs/inference/images/overview)
- [Together reference images](https://docs.together.ai/docs/inference/images/reference-images)
- [fal FLUX Pro Fill API](https://fal.ai/models/fal-ai/flux-pro/v1/fill/api)
- [Replicate predictions](https://replicate.com/docs/topics/predictions/create-a-prediction)
- [BFL generation/polling](https://docs.bfl.ai/quick_start/generating_images)
- [BFL image editing](https://docs.bfl.ai/flux_2/flux2_image_editing)
