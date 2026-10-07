import type {Adapter} from './types';import {request,auth,download,unbase64} from './common';
export const openai:Adapter={async run(c,r){const root=(r.baseUrl??'https://api.openai.com/v1').replace(/\/$/,'');
 const images=(r.references??[]).map((data,index)=>({name:'image[]',bytes:unbase64(data.split(',')[1]??''),filename:`reference-${index+1}.jpg`,mime:'image/jpeg'}));
 const background=r.transparentBackground?{background:'transparent',output_format:'png'}:{};
 const highFidelity=!!r.source&&/^gpt-image-1(?:\.5)?(?:-\d{4}-\d{2}-\d{2})?$/.test(r.model);
 const response=r.source||images.length?await request(c,{url:root+'/images/edits',method:'POST',credential:auth(c),multipart:[{name:'model',text:r.model},{name:'prompt',text:r.prompt},...(highFidelity?[{name:'input_fidelity',text:'high'}]:[]),...(r.size?[{name:'size',text:r.size}]:[]),...(r.quality?[{name:'quality',text:r.quality}]:[]),...(r.transparentBackground?[{name:'background',text:'transparent'},{name:'output_format',text:'png'}]:[]),...(r.source?[{name:'image[]',bytes:r.source.png,filename:'source.png'}, {name:'mask',bytes:r.source.alphaMask,filename:'mask.png'}]:[]),...images]}):await request(c,{url:root+'/images/generations',method:'POST',credential:auth(c),json:{model:r.model,prompt:r.prompt,...(r.size?{size:r.size}:{}),...(r.quality?{quality:r.quality}:{}),...background,n:1}});
 const image=response.data?.[0];if(image?.b64_json)return unbase64(image.b64_json);return download(c,image?.url);
}};
