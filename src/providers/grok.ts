import type {Adapter} from './types';import {request,auth,dataUrl,unbase64,download,EDIT_GUIDANCE} from './common';import {PluginError} from '@photon/plugin-sdk';
const RATIOS=new Set(['auto','1:1','16:9','9:16','4:3','3:4','3:2','2:3','2:1','1:2','19.5:9','9:19.5','20:9','9:20','21:9','5:2']);
const PIXELS:Record<string,string>={'1024x1024':'1:1','1536x1024':'3:2','1024x1536':'2:3','2048x1152':'16:9','1152x2048':'9:16','2048x1536':'4:3','1536x2048':'3:4','2048x1024':'2:1','1024x2048':'1:2'};
const ratio=(size:string)=>RATIOS.has(size)?size:PIXELS[size]??'1:1';
function picture(model:string,quality:string){const v2=/imagine-image-2/i.test(model);const [tier,scale]=quality.split('@');const resolution=['1k','1.5k','2k'].includes(tier)?tier:['1k','1.5k','2k'].includes(scale)?scale:'';const named=['auto','low','medium'].includes(tier)?tier:'';return {...(resolution?{resolution}:{}),...(v2&&named?{quality:named}:{})};}
function imagine(name:string):Adapter{return {async run(c,r){const response=await request(c,{url:'https://api.x.ai/v1/images/'+(r.source?'edits':'generations'),method:'POST',authorization:r.accessToken?'Bearer '+r.accessToken:undefined,credential:r.accessToken?undefined:auth(c),json:{model:r.model,prompt:r.prompt+(r.source?EDIT_GUIDANCE:''),n:1,response_format:'b64_json',...(r.size?{aspect_ratio:ratio(r.size)}:{}),...picture(r.model,r.quality),...(r.source?{images:[{type:'image_url',url:dataUrl(r.source.png)},{type:'image_url',url:dataUrl(r.source.whiteMask)}]}:{})}});
 const image=response.data?.[0];if(image?.b64_json)return unbase64(image.b64_json);if(image?.url)return download(c,image.url);throw new PluginError('NO_IMAGE',name+' returned no image.');}};}
export const grok=imagine('Grok');
export const xai=imagine('X API');
