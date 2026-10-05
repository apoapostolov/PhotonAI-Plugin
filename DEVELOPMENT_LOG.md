# DEVELOPMENT_LOG.md

## Unreleased

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

Very low on Ideogram is sent only for an edit. Midjourney still does not call an image API. Host changes required before these flows run on stock Photon are in [Photon host changes](docs/photon-host-changes.md).

