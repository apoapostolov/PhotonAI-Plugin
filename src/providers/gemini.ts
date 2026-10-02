import type {Adapter} from './types';import {request,auth,base64,unbase64,EDIT_GUIDANCE} from './common';import {PluginError} from '@photon/plugin-sdk';
export const gemini:Adapter={async run(c,r){const parts:any[]=[{text:r.prompt+(r.source?EDIT_GUIDANCE:'')}];if(r.source)parts.push({inlineData:{mimeType:'image/png',data:base64(r.source.png)}},{inlineData:{mimeType:'image/png',data:base64(r.source.whiteMask)}});
 const response=await request(c,{url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model)}:generateContent`,method:'POST',credential:auth(c,'x-goog-api-key'),json:{contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE']}}});
 for(const candidate of response.candidates??[])for(const part of candidate.content?.parts??[])if(part.inlineData?.mimeType?.startsWith('image/'))return unbase64(part.inlineData.data);
 throw new PluginError('NO_IMAGE',response.promptFeedback?.blockReason?'Provider declined this image request.':'Gemini returned no image. Try a different prompt or image model.');
}};
