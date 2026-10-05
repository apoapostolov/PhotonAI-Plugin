import type {Model,ProviderId} from './types';
export const SIZE_PATTERN=/^(?:auto|[1-9]\d{0,4}x[1-9]\d{0,4}|[1-9]\d?(?:\.\d)?:[1-9]\d?(?:\.\d)?)$/;
interface OutputChoice {sizes?:string[];qualities?:string[];maxEdge?:number;}
const FLEX=['auto','1024x1024','1536x1024','1024x1536','2048x2048','2048x1152','3840x2160','2160x3840'];
const FIXED=['1024x1024','1536x1024','1024x1536'];
const IMAGE_QUALITY=['auto','low','medium','high'];
const IMAGE_25_QUALITY=['auto','low','medium','high','xhigh','max'];
const GEMINI_RATIOS=['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9'];
const GEMINI_EXTREME=['1:4','4:1','1:8','8:1'];
const GEMINI_25=['1024x1024','832x1248','1248x832','864x1184','1184x864','896x1152','1152x896','768x1344','1344x768','1536x672'];
const GROK_RATIOS=['auto','1:1','16:9','9:16','4:3','3:4','3:2','2:3','2:1','1:2','19.5:9','9:19.5','20:9','9:20'];
const GROK_WIDE=['21:9','5:2'];
const GROK_2_QUALITY=['auto','low','medium','auto@1.5k','low@1.5k','medium@1.5k','auto@2k','low@2k','medium@2k'];
const IDEOGRAM_SIZES=['auto','2048x2048','1440x2880','2880x1440','1664x2496','2496x1664','1792x2240','2240x1792','1440x2560','2560x1440','1600x2560','2560x1600','1728x2304','2304x1728','1296x3168','3168x1296','1152x2944','2944x1152','1248x3328','3328x1248','1280x3072','3072x1280','1024x3072','3072x1024','1024x1024','896x1120','1120x896','864x1152','1152x864','832x1248','1248x832','800x1280','1280x800','720x1280','1280x720','720x1440','1440x720'];
const IDEOGRAM_QUALITY=['high','medium','low','very_low'];
const BFL_SIZES=['1024x1024','1536x1024','1024x1536','2048x1152','1152x2048','1920x1088','1088x1920','2048x2048'];
const FAL_SIZES=['1024x1024','512x512','1024x768','768x1024','1024x576','576x1024'];
const REPLICATE_RATIOS=['1:1','16:9','21:9','3:2','2:3','4:5','5:4','3:4','4:3','9:16','9:21'];
const TOGETHER_SIZES=['1024x1024','1344x768','768x1344'];
const MIDJOURNEY_SIZES=['1024x1024','1536x1024','1024x1536'];
function openAi(id:string):OutputChoice|null{const name=id.toLowerCase();if(/dall-e-2/.test(name))return {sizes:['256x256','512x512','1024x1024'],maxEdge:1024};if(/dall-e-3/.test(name))return {sizes:['1024x1024','1792x1024','1024x1792'],qualities:['standard','hd'],maxEdge:1792};if(/gpt-image-2\.5/.test(name))return {sizes:FLEX,qualities:IMAGE_25_QUALITY,maxEdge:3840};if(/gpt-image-2(?:[^.]|$)/.test(name))return {sizes:FLEX,qualities:IMAGE_QUALITY,maxEdge:3840};if(/gpt-image-1|chatgpt-image/.test(name))return {sizes:FIXED,qualities:IMAGE_QUALITY,maxEdge:1536};if(/gpt-image|chatgpt-image|dall-e/.test(name))return {sizes:FLEX,qualities:IMAGE_QUALITY,maxEdge:3840};return null;}
function gemini(id:string):OutputChoice|null{const name=id.toLowerCase();if(!/image/.test(name)||/^imagen/.test(name))return null;if(/2\.5-flash-image/.test(name))return {sizes:GEMINI_25,maxEdge:1536};if(/flash-lite-image|lite-image/.test(name))return {sizes:GEMINI_RATIOS,qualities:['1K'],maxEdge:2048};if(/pro-image/.test(name))return {sizes:GEMINI_RATIOS,qualities:['1K','2K','4K'],maxEdge:4096};if(/flash-image/.test(name))return {sizes:[...GEMINI_RATIOS,...GEMINI_EXTREME],qualities:['1K','2K','4K','512'],maxEdge:4096};return {sizes:GEMINI_RATIOS,qualities:['1K','2K','4K'],maxEdge:4096};}
function grok(id:string):OutputChoice|null{const name=id.toLowerCase();if(!/imagine-image/.test(name))return null;if(/imagine-image-2/.test(name))return {sizes:[...GROK_RATIOS,...GROK_WIDE],qualities:GROK_2_QUALITY,maxEdge:2048};if(/imagine-image-(?:quality|pro)/.test(name))return {sizes:GROK_RATIOS,qualities:['1k','1.5k','2k'],maxEdge:2048};if(/(?:^|\/)grok-imagine-image$/.test(name))return {sizes:GROK_RATIOS,qualities:['1k','2k'],maxEdge:2048};return {sizes:[...GROK_RATIOS,...GROK_WIDE],qualities:GROK_2_QUALITY,maxEdge:2048};}
export function outputOptions(provider:ProviderId,modelId:string):OutputChoice|null{if(provider==='openai'||provider==='codex')return openAi(modelId);if(provider==='gemini')return gemini(modelId);if(provider==='xai'||provider==='grok')return grok(modelId);if(provider==='midjourney')return {sizes:MIDJOURNEY_SIZES,maxEdge:2048};if(provider==='ideogram')return /ideogram-4[.-]5/i.test(modelId)?{sizes:IDEOGRAM_SIZES,qualities:IDEOGRAM_QUALITY,maxEdge:3328}:null;if(provider==='bfl')return /fill/i.test(modelId)?null:{sizes:BFL_SIZES,maxEdge:2048};if(provider==='fal')return /fill/i.test(modelId)?null:{sizes:FAL_SIZES,maxEdge:2048};if(provider==='replicate')return /fill/i.test(modelId)?null:{sizes:REPLICATE_RATIOS,maxEdge:1440};if(provider==='together')return {sizes:TOGETHER_SIZES,maxEdge:2048};return null;}
export function applyOutputOptions(provider:ProviderId,model:Model):Model{if(provider==='custom')return model;const choice=outputOptions(provider,model.id);const next={...model,...(choice?.maxEdge?{maxEdge:choice.maxEdge}:{})};if(choice?.sizes?.length)next.sizes=[...choice.sizes];else delete next.sizes;if(choice?.qualities?.length)next.qualities=[...choice.qualities];else delete next.qualities;return next;}
