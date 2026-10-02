import type {Adapter} from './types';import {request,auth,download,unbase64} from './common';
export const openai:Adapter={async run(c,r){const root=(r.baseUrl??'https://api.openai.com/v1').replace(/\/$/,'');
 const response=r.source?await request(c,{url:root+'/images/edits',method:'POST',credential:auth(c),multipart:[{name:'model',text:r.model},{name:'prompt',text:r.prompt},...(r.size?[{name:'size',text:r.size}]:[]),...(r.quality?[{name:'quality',text:r.quality}]:[]),{name:'image[]',bytes:r.source.png,filename:'source.png'},{name:'mask',bytes:r.source.alphaMask,filename:'mask.png'}]}):await request(c,{url:root+'/images/generations',method:'POST',credential:auth(c),json:{model:r.model,prompt:r.prompt,...(r.size?{size:r.size}:{}),...(r.quality?{quality:r.quality}:{}),n:1}});
 const image=response.data?.[0];if(image?.b64_json)return unbase64(image.b64_json);return download(c,image?.url);
}};
