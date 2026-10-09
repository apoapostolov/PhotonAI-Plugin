import type {Model,Provider,ProviderId} from './types';
import {applyOutputOptions} from './output-options';
export const CATALOG_VERSION=1;
const listed=(provider:ProviderId,models:Model[])=>models.map(model=>applyOutputOptions(provider,model));
const imagine:Model[]=[{id:'grok-imagine-image-2.0',label:'Grok Imagine 2.0',generate:true,edit:'prompt',maxEdge:2048},{id:'grok-imagine-image',label:'Grok Imagine',generate:true,edit:'prompt',maxEdge:2048}];
export const providers:Provider[]=[
 {id:'openai',label:'OpenAI',origin:'https://api.openai.com',models:listed('openai',[{id:'gpt-image-2.5-sunburst',label:'GPT Image Sunburst',generate:true,edit:'mask',maxEdge:2048},{id:'gpt-image-2.5-flare',label:'GPT Image Flare',generate:true,edit:'mask',maxEdge:2048}])},
 {id:'codex',label:'Codex',origin:'https://chatgpt.com',models:listed('codex',[{id:'gpt-image-2.5-flare',label:'GPT Image Flare',generate:true,edit:'prompt',maxEdge:2048},{id:'gpt-image-2.5-sunburst',label:'GPT Image Sunburst',generate:true,edit:'prompt',maxEdge:2048}])},
 {id:'gemini',label:'Google Gemini',origin:'https://generativelanguage.googleapis.com',models:listed('gemini',[{id:'gemini-3.1-flash-image',label:'Gemini Flash Image',generate:true,edit:'prompt',maxEdge:2048}])},
 {id:'midjourney',label:'Midjourney',origin:'https://www.midjourney.com',models:listed('midjourney',[{id:'v8.2',label:'Midjourney V8.2',generate:true,edit:false,maxEdge:2048}])},
 {id:'ideogram',label:'Ideogram',origin:'https://api.ideogram.ai',models:listed('ideogram',[{id:'ideogram-4.5',label:'Ideogram 4.5',generate:true,edit:'mask',maxEdge:2048}])},
 {id:'bfl',label:'Black Forest Labs',origin:'https://api.bfl.ai',models:listed('bfl',[{id:'flux-2-pro',label:'FLUX.2 Pro',generate:true,edit:'prompt',maxEdge:2048},{id:'flux-pro-1.0-fill',label:'FLUX Pro Fill',generate:false,edit:'mask',maxEdge:2048}])},
 {id:'fal',label:'fal.ai',origin:'https://queue.fal.run',models:listed('fal',[{id:'fal-ai/flux/dev',label:'FLUX Dev',generate:true,edit:false,maxEdge:2048},{id:'fal-ai/flux-pro/v1/fill',label:'FLUX Pro Fill',generate:false,edit:'mask',maxEdge:2048}])},
 {id:'replicate',label:'Replicate',origin:'https://api.replicate.com',models:listed('replicate',[{id:'black-forest-labs/flux-dev',label:'FLUX Dev',generate:true,edit:false,maxEdge:2048},{id:'black-forest-labs/flux-fill-pro',label:'FLUX Fill Pro',generate:false,edit:'mask',maxEdge:2048}])},
 {id:'together',label:'Together AI',origin:'https://api.together.ai',models:listed('together',[{id:'black-forest-labs/FLUX.2-dev',label:'FLUX.2 Dev',generate:true,edit:false,maxEdge:2048},{id:'black-forest-labs/FLUX.2-pro',label:'FLUX.2 Pro',generate:true,edit:'prompt',maxEdge:2048}])},
 {id:'xai',label:'X API',origin:'https://api.x.ai',models:listed('xai',imagine)},
 {id:'grok',label:'Grok',origin:'https://api.x.ai',models:listed('grok',imagine)},
 {id:'custom',label:'Custom OpenAI-compatible',origin:'',models:[]}
];
export function modelsFor(provider:Provider,mode:string){return provider.models.filter(m=>mode==='generate'?m.generate:!!m.edit);}
