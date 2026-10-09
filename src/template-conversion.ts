import {PluginError,type PhotonApi} from '@photon/plugin-sdk';
import type {ProviderId} from './providers/types';
import {auth,raw,request} from './providers/common';
import {refreshSession,type OAuthSession} from './providers/oauth';
import {templateTags} from './library';

export type ConversionDirection='json'|'narrative';

export function canConvertTemplate(provider:ProviderId,modelId:string):boolean{
  if(/(?:^|\/)(?:gpt-image|chatgpt-image|dall-e|grok-imagine-image)(?:[-.]|$)/i.test(modelId))return false;
  return provider==='codex'||provider==='gemini'||provider==='custom'||provider==='openai';
}

function responseText(response:any):string{
  if(typeof response?.output_text==='string')return response.output_text;
  if(!Array.isArray(response?.output))return '';
  return response.output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[]).filter((part:any)=>part?.type==='output_text'&&typeof part.text==='string').map((part:any)=>part.text).join('');
}
function codexStreamText(bytes:Uint8Array):string{
  const stream=new TextDecoder().decode(bytes);
  let deltas='',completed=false,final='';const finishedItems:string[]=[];
  for(const block of stream.split(/\r?\n\r?\n/)){
    const data=block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data||data==='[DONE]')continue;
    let event:any;try{event=JSON.parse(data);}catch{continue;}
    if(event.type==='response.output_text.delta'&&typeof event.delta==='string')deltas+=event.delta;
    if(event.type==='response.output_item.done'){const itemText=responseText({output:[event.item]});if(itemText)finishedItems.push(itemText);}
    if(event.type==='response.completed'){completed=true;final=responseText(event.response);}
    if(event.type==='response.failed'||event.type==='response.incomplete')throw new PluginError('PROVIDER_ERROR',String(event.response?.error?.message??'Codex did not complete the conversion.'));
  }
  if(!completed)throw new PluginError('INVALID_RESULT','Codex ended before completing the conversion. The template was not changed.');
  return final||finishedItems.join('')||deltas;
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

export async function convertTemplate(api:PhotonApi,options:{provider:ProviderId;model:string;baseUrl:string;credential:string;text:string;direction:ConversionDirection;codexSession?:OAuthSession;onCodexSession?:(session:OAuthSession)=>Promise<void>}):Promise<string>{
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
    if(provider==='codex'){
      let session=options.codexSession;
      if(!session)throw new PluginError('AUTHENTICATION','Sign in to Codex before converting.');
      if(session.refreshToken&&(!session.expiresAt||session.expiresAt<Date.now()+60_000)){
        session=await refreshSession(context,'codex',session);
        await options.onCodexSession?.(session);
      }
      const headers:Record<string,string>={originator:'codex_cli_rs'};
      if(session.accountId)headers['ChatGPT-Account-Id']=session.accountId;
      const reply=await raw<Uint8Array>(context,{url:'https://chatgpt.com/backend-api/codex/responses',method:'POST',headers,authorization:'Bearer '+session.accessToken,response:'bytes',json:{model,stream:true,store:false,tool_choice:'none',parallel_tool_calls:false,input:[{role:'user',content:[{type:'input_text',text:instruction+'\n\nTemplate:\n'+text}]}]}});
      if(reply.status<200||reply.status>=300){let message='Codex request failed ('+reply.status+').';try{const body=JSON.parse(new TextDecoder().decode(reply.body));message=String(body.error?.message??body.detail??message);}catch{}throw new PluginError(reply.status===401||reply.status===403?'AUTHENTICATION':'PROVIDER_ERROR',message.slice(0,1000));}
      output=codexStreamText(reply.body);
    }else if(provider==='gemini'){
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
