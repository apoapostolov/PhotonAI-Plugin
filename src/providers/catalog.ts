import type {Provider} from './types';
export const CATALOG_VERSION=1;
export const providers:Provider[]=[
 {id:'openai',label:'OpenAI',origin:'https://api.openai.com',models:[{id:'gpt-image-2.5-sunburst',label:'GPT Image Sunburst',generate:true,edit:'mask',maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536'],qualities:['auto','low','medium','high']},{id:'gpt-image-2.5-flare',label:'GPT Image Flare',generate:true,edit:'mask',maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536'],qualities:['auto','low','medium','high']}]},
 {id:'gemini',label:'Google Gemini',origin:'https://generativelanguage.googleapis.com',models:[{id:'gemini-3.1-flash-image',label:'Gemini Flash Image',generate:true,edit:'prompt',maxEdge:2048}]},
 {id:'together',label:'Together AI',origin:'https://api.together.ai',models:[{id:'black-forest-labs/FLUX.2-dev',label:'FLUX.2 Dev',generate:true,edit:false,maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536']},{id:'black-forest-labs/FLUX.2-pro',label:'FLUX.2 Pro',generate:true,edit:'prompt',maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536']}]},
 {id:'fal',label:'fal.ai',origin:'https://queue.fal.run',models:[{id:'fal-ai/flux/dev',label:'FLUX Dev',generate:true,edit:false,maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536']},{id:'fal-ai/flux-pro/v1/fill',label:'FLUX Pro Fill',generate:false,edit:'mask',maxEdge:2048}]},
 {id:'replicate',label:'Replicate',origin:'https://api.replicate.com',models:[{id:'black-forest-labs/flux-dev',label:'FLUX Dev',generate:true,edit:false,maxEdge:2048},{id:'black-forest-labs/flux-fill-pro',label:'FLUX Fill Pro',generate:false,edit:'mask',maxEdge:2048}]},
 {id:'bfl',label:'Black Forest Labs',origin:'https://api.bfl.ai',models:[{id:'flux-2-pro',label:'FLUX.2 Pro',generate:true,edit:'prompt',maxEdge:2048,sizes:['1024x1024','1536x1024','1024x1536']},{id:'flux-pro-1.0-fill',label:'FLUX Pro Fill',generate:false,edit:'mask',maxEdge:2048}]},
 {id:'custom',label:'Custom OpenAI-compatible',origin:'',models:[]}
];
export function modelsFor(provider:Provider,mode:string){return provider.models.filter(m=>mode==='generate'?m.generate:!!m.edit);}
