import {PluginError,type PhotonApi} from '@photon/plugin-sdk';
import type {ProviderId} from './providers/types';
import {auth,request} from './providers/common';
import {templateTags} from './library';

export type ConversionDirection='json'|'narrative';

export function canConvertTemplate(provider:ProviderId,modelId:string):boolean{
  if(/^gpt-image-|^chatgpt-image/i.test(modelId))return false;
  return provider==='gemini'||provider==='custom'||provider==='openai';
}

function fields(text:string):string[]{return templateTags(text).map(tag=>text.slice(tag.start,tag.end)).sort();}
function strings(value:unknown):string[]{
  if(typeof value==='string')return [value];
  if(Array.isArray(value))return value.flatMap(strings);
  if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,item])=>[key,...strings(item)]);
  return [];
}
function unwrap(text:string):string{const trimmed=text.trim();const fence=/^```(?:json|text|markdown)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed);return (fence?.[1]??trimmed).trim();}
function checkedResult(source:string,output:string,direction:ConversionDirection):string{
  const result=unwrap(output);
  if(!result)throw new PluginError('INVALID_RESULT','The model returned no template text.');
  let rendered=result;
  if(direction==='json'){
    let parsed:unknown;
    try{parsed=JSON.parse(result);}catch{throw new PluginError('INVALID_RESULT','The model did not return valid JSON. The template was not changed.');}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new PluginError('INVALID_RESULT','The model must return a JSON object. The template was not changed.');
    rendered=JSON.stringify(parsed,null,2);
  }
  const before=direction==='narrative'?fields(strings(JSON.parse(source)).join('\n')):fields(source);
  const after=direction==='json'?fields(strings(JSON.parse(rendered)).join('\n')):fields(rendered);
  if(before.some((field,index)=>field!==after[index])||before.length!==after.length)throw new PluginError('INVALID_RESULT','The model changed a template field. The template was not changed.');
  return rendered;
}

export async function convertTemplate(api:PhotonApi,options:{provider:ProviderId;model:string;baseUrl:string;credential:string;text:string;direction:ConversionDirection}):Promise<string>{
  const {provider,model,text,direction}=options;
  if(!canConvertTemplate(provider,model))throw new PluginError('MODEL_UNAVAILABLE','The selected image model cannot return text. Choose a text-capable model to convert this template.');
  if(!text.trim())throw new PluginError('PROMPT_REQUIRED','Write template instructions before converting.');
  if(direction==='narrative'){
    let parsed:unknown;
    try{parsed=JSON.parse(text);}catch{throw new PluginError('INVALID_INPUT','Enter valid JSON before converting to narrative text.');}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new PluginError('INVALID_INPUT','The template must contain a JSON object.');
  }
  const instruction=direction==='json'
    ?'Convert these image-design template instructions into one useful JSON object. Organize their existing meaning under descriptive keys. Preserve every detail and every {{...}} template field verbatim. Do not invent requirements. Return only the JSON object, with no code fence.'
    :'Convert this JSON image-design template into clear natural-language instructions. Preserve every detail and every {{...}} template field verbatim. Do not invent requirements. Return only the narrative text, with no code fence.';
  return api.jobs.run('Converting template…',async job=>{
    await job.progress('Sending to '+model+'…');
    const context={api,job,credential:options.credential};
    let output='';
    if(provider==='gemini'){
      const body=await request(context,{url:`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,method:'POST',credential:auth(context,'x-goog-api-key'),json:{contents:[{role:'user',parts:[{text:instruction+'\n\nTemplate:\n'+text}]}],generationConfig:{responseModalities:['TEXT']}}});
      output=(body.candidates??[]).flatMap((candidate:any)=>candidate.content?.parts??[]).filter((part:any)=>!part.thought&&typeof part.text==='string').map((part:any)=>part.text).join('\n');
    }else{
      const base=(provider==='custom'?options.baseUrl:'https://api.openai.com/v1').replace(/\/+$/,'');
      const body=await request(context,{url:base+'/chat/completions',method:'POST',credential:auth(context),json:{model,messages:[{role:'user',content:instruction+'\n\nTemplate:\n'+text}]}});
      const content=body.choices?.[0]?.message?.content;
      output=typeof content==='string'?content:Array.isArray(content)?content.filter((part:any)=>part?.type==='text').map((part:any)=>part.text).join('\n'):'';
    }
    job.signal.throwIfAborted();
    return checkedResult(text,output,direction);
  });
}
