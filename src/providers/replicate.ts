import type {Adapter} from './types';import {request,auth,dataUrl,download,poll} from './common';
const RATIOS=new Set(['1:1','16:9','21:9','3:2','2:3','4:5','5:4','3:4','4:3','9:16','9:21']);
const PIXELS:Record<string,string>={'1024x1024':'1:1','1344x768':'16:9','1536x640':'21:9','1216x832':'3:2','832x1216':'2:3','896x1088':'4:5','1088x896':'5:4','896x1152':'3:4','1152x896':'4:3','768x1344':'9:16','640x1536':'9:21','1536x1024':'3:2','1024x1536':'2:3'};
const aspect=(size:string)=>RATIOS.has(size)?size:PIXELS[size]??'1:1';
export const replicate:Adapter={async run(c,r){const queued=await request(c,{url:`https://api.replicate.com/v1/models/${r.model}/predictions`,method:'POST',credential:auth(c),json:{input:{prompt:r.prompt,output_format:'png',...(r.source?{image:dataUrl(r.source.png),mask:dataUrl(r.source.whiteMask)}:{aspect_ratio:aspect(r.size),num_outputs:1})}}});
 try{const output=queued.status==='succeeded'?queued.output:await poll(c,()=>request(c,{url:queued.urls.get,credential:auth(c)}),v=>v.status==='succeeded'?v.output:undefined,v=>['failed','canceled'].includes(v.status)?String(v.error??'Replicate job cancelled.'):undefined);return download(c,Array.isArray(output)?output[0]:output);}
 catch(error){if(c.job.signal.aborted&&queued.urls?.cancel)void c.api.network.request({url:queued.urls.cancel,method:'POST',credential:auth(c)}).catch(()=>{});throw error;}
}};
