import {PluginError,type PhotonApi,type PanelModel,type Control,type Capture,type ImagePixels} from '@photon/plugin-sdk';
import {providers,modelsFor} from './providers/catalog';
import {adapters} from './providers';
import type {Mode,ProviderId,Model,GenerateRequest,ImageInput} from './providers/types';
import {REMOVE_PROMPT,base64} from './providers/common';
interface Settings {provider:ProviderId;models:Partial<Record<ProviderId,string>>;customBase:string;customModel:string;customEdit:boolean;customSizes:string;customQualities:string;customMaxEdge:number;}
interface Result {bytes:Uint8Array;image:ImagePixels;capture?:Capture;name:string;mode:Mode;target?:{documentId:string;revision:number};}
export async function activate(api:PhotonApi){
  let settings:Settings={provider:'openai',models:{},customBase:'https://api.openai.com/v1',customModel:'',customEdit:true,customSizes:'1024x1024,1536x1024,1024x1536',customQualities:'',customMaxEdge:2048,...await api.settings.get<Partial<Settings>>()};
  if(!providers.some(p=>p.id===settings.provider))settings.provider='openai';
  let mode:Mode='generate',prompt='',size='1024x1024',quality='auto',busy=false,error='',credential=false,persistent=true,result:Result|undefined,insert=false,hasSelection=false;
  const subscriptions:{dispose():void}[]=[];let disposed=false;
  const provider=()=>providers.find(p=>p.id===settings.provider)!;
  const models=():Model[]=>settings.provider==='custom'?[{id:settings.customModel,label:settings.customModel||'Enter a model ID',generate:true,edit:settings.customEdit?'mask':false,maxEdge:Math.min(8192,Math.max(64,settings.customMaxEdge||2048)),sizes:settings.customSizes.split(',').map(v=>v.trim()).filter(v=>/^[1-9][0-9]{1,3}x[1-9][0-9]{1,3}$/.test(v)),qualities:settings.customQualities.split(',').map(v=>v.trim()).filter(Boolean)}]:modelsFor(provider(),mode);
  const model=()=>models().find(m=>m.id===settings.models[settings.provider])??models()[0];
  const keyId=()=>settings.provider;
  const endpoint=()=>settings.provider==='custom'?new URL(settings.customBase).origin:provider().origin;
  const refreshContext=async()=>{const doc=await api.documents.active();hasSelection=!!doc?.hasSelection;};
  const clearResult=async()=>{if(result?.capture)await api.documents.release(result.capture.token).catch(()=>{});result=undefined;};
  const save=()=>api.settings.set(settings as unknown as Record<string,unknown>);
  const refreshCredential=async()=>{const info=await api.credentials.status(keyId());credential=info.configured;try{credential=credential&&info.origin===endpoint();}catch{credential=false;}persistent=info.persistent;};
  const publish=async()=>{
    if(disposed)return;const m=model();if(m?.sizes?.length&&!m.sizes.includes(size))size=m.sizes[0];if(m?.qualities?.length&&!m.qualities.includes(quality))quality=m.qualities[0];const controls:Control[]=[
      {type:'text',text:'Create and edit with your own AI accounts. Provider requests are billed to your API key.'},
      {type:'tabs',id:'mode',label:'Image operation',value:mode,disabled:busy,options:[{value:'generate',label:'Generate'},{value:'remove',label:'Remove'},{value:'fill',label:'Fill'}]},
      {type:'select',id:'provider',label:'Provider',value:settings.provider,disabled:busy,options:providers.map(p=>({value:p.id,label:p.label}))}
    ];
    if(settings.provider==='custom')controls.push({type:'input',id:'customBase',label:'API base URL',value:settings.customBase,disabled:busy,description:'An OpenAI-compatible API base, including /v1 when required.'},{type:'input',id:'customModel',label:'Model ID',value:settings.customModel,disabled:busy},{type:'input',id:'customSizes',label:'Supported sizes',value:settings.customSizes,disabled:busy,description:'Comma-separated widthxheight values; leave blank to use provider defaults.'},{type:'input',id:'customQualities',label:'Supported qualities',value:settings.customQualities,disabled:busy,description:'Comma-separated API values; leave blank if unsupported.'},{type:'number',id:'customMaxEdge',label:'Maximum reference edge',value:settings.customMaxEdge,min:64,max:8192,disabled:busy},{type:'checkbox',id:'customEdit',label:'This model supports masked image edits',value:settings.customEdit,disabled:busy});
    else controls.push({type:'select',id:'model',label:'Model',value:m?.id??'',disabled:busy,options:models().map(m=>({value:m.id,label:m.label}))});
    controls.push({type:'button',id:'configure',label:credential?'Change API key':'Connect provider',disabled:busy},{type:'text',text:credential?(persistent?'API key saved securely on this device.':'API key available for this session.'): 'Connect this provider to start.'});
    if(credential)controls.push({type:'button',id:'forget',label:'Forget API key',disabled:busy});
    if(mode!=='generate')controls.push({type:'text',text:hasSelection?'The current selection defines the editable region.':'Make a selection in the document to continue.'},...(m?.edit==='prompt'?[{type:'text' as const,text:'Prompt-based editing: this model interprets the mask as a reference. Photon preserves pixels outside your selection when you apply.'}]:[]));
    if(mode!=='generate'&&!m?.edit)controls.push({type:'text',tone:'danger',text:'This model does not support image editing. Choose a model with edit support.'});
    if(mode!=='remove')controls.push({type:'textarea',id:'prompt',label:mode==='fill'?'Describe the fill':'Describe your image',value:prompt,disabled:busy});
    if(m?.sizes?.length)controls.push({type:'select',id:'size',label:'Output size',value:size,disabled:busy,options:m.sizes.map(value=>({value,label:value.replace('x',' × ')}))});
    if(m?.qualities?.length)controls.push({type:'select',id:'quality',label:'Quality',value:quality,disabled:busy,options:m.qualities.map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))});
    if(mode==='generate')controls.push({type:'checkbox',id:'insert',label:'Insert into the current document',value:insert,disabled:busy});
    if(error)controls.push({type:'text',tone:'danger',text:error});
    controls.push({type:'button',id:'run',tone:'primary',label:busy?'Working…':result?'Regenerate':mode==='generate'?'Generate Image':mode==='remove'?'Remove Selection':'Generate Fill',disabled:busy||!credential||!m?.id||(mode==='generate'?!m?.generate:!m?.edit)||mode!=='generate'&&!hasSelection||mode!=='remove'&&!prompt.trim()});
    if(result)controls.push({type:'group',label:'Result preview',children:[{type:'image',label:result.name,src:'data:image/png;base64,'+base64(result.bytes)},{type:'text',text:'Apply creates a new layer with one undo step. Your original layers stay editable.'},{type:'button',id:'apply',tone:'primary',label:'Apply',disabled:busy},{type:'button',id:'discard',label:'Discard preview',disabled:busy},{type:'button',id:'export',label:'Save result as PNG…',disabled:busy}]});
    await api.ui.render('ai',{title:'AI Studio',controls} satisfies PanelModel);
  };
  const run=async()=>{
    if(busy)return;const selected=model();if(!selected?.id)throw new PluginError('MODEL_UNAVAILABLE','Choose an image model.');
    if(mode!=='generate'&&!selected.edit)throw new PluginError('MODEL_UNAVAILABLE','This model does not support editing.');
    busy=true;error='';await publish();const requestedMode=mode;const requestedProvider=settings.provider;let capture:Capture|undefined;
    try{
      const next=await api.jobs.run(requestedMode==='generate'?'Generating image…':requestedMode==='remove'?'Removing selection…':'Generating fill…',async job=>{
        const target=insert&&requestedMode==='generate'?await api.documents.active():null;if(insert&&requestedMode==='generate'&&!target)throw new PluginError('DOCUMENT_REQUIRED','Open a document before inserting an image.');
        let source:ImageInput|undefined;
        if(requestedMode!=='generate'){
          await job.progress('Capturing selection…');capture=await api.documents.capture({selection:true,padding:64});job.signal.throwIfAborted();
          const encoded=await api.images.encode(capture,{maxEdge:selected.maxEdge});
          const maskPixels=new Uint8Array(capture.width*capture.height*4);for(let i=0;i<capture.mask!.length;i++){maskPixels[i*4]=maskPixels[i*4+1]=maskPixels[i*4+2]=capture.mask![i];maskPixels[i*4+3]=255;}
          const maskImage={width:capture.width,height:capture.height,pixels:maskPixels};
          const white=await api.images.encode(maskImage,{maxEdge:selected.maxEdge,mask:'white'}),alpha=await api.images.encode(maskImage,{maxEdge:selected.maxEdge,mask:'alpha'});
          source={png:encoded.bytes,whiteMask:white.bytes,alphaMask:alpha.bytes,width:encoded.width,height:encoded.height};
        }
        const request:GenerateRequest={provider:requestedProvider,mode:requestedMode,model:selected.id,prompt:requestedMode==='remove'?REMOVE_PROMPT:prompt.trim(),size:selected.sizes?.length?size:requestedProvider==='custom'?'':'1024x1024',quality:selected.qualities?.length?quality:'',source,...(requestedProvider==='custom'?{baseUrl:settings.customBase}:{})};
        await job.progress('Sending to '+provider().label+'…');const bytes=await adapters[requestedProvider].run({api,job,credential:keyId()},request);job.signal.throwIfAborted();
        await job.progress('Preparing preview…');const image=await api.images.decode(bytes,capture?{width:capture.bounds.width,height:capture.bounds.height}:undefined);job.signal.throwIfAborted();const encoded=await api.images.encode(image,{maxEdge:8192});
        return {bytes:encoded.bytes,image,capture,name:requestedMode==='generate'?'AI Generated Image':requestedMode==='remove'?'AI Remove':'Generative Fill',mode:requestedMode,target:target?{documentId:target.id,revision:target.revision}:undefined} satisfies Result;
      });
      await clearResult();result=next;capture=undefined;
    }catch(e){if(capture)await api.documents.release(capture.token).catch(()=>{});error=e instanceof Error?e.message:String(e);}
    finally{busy=false;await refreshContext();await publish();}
  };
  const onEvent=async(event:{id:string;value?:string|number|boolean})=>{
    if(busy)return;error='';
    try{
      if(event.id==='configure'){busy=true;await publish();if(settings.provider==='custom')await api.network.allowEndpoint(endpoint());const info=await api.credentials.configure(keyId(),provider().label+' API key',endpoint());credential=info.configured;persistent=info.persistent;busy=false;}
      else if(event.id==='forget'){await api.credentials.delete(keyId());credential=false;}
      else if(event.id==='run'){await run();return;}
      else if(event.id==='apply'&&result){busy=true;await publish();await api.documents.applyImage({image:result.image,name:result.name,captureToken:result.capture?.token,documentId:result.target?.documentId,expectedRevision:result.target?.revision,newDocument:result.mode==='generate'&&!result.target});await clearResult();busy=false;await refreshContext();}
      else if(event.id==='discard')await clearResult();
      else if(event.id==='export'&&result){const file=await api.files.pick({save:true,name:result.name+'.png'});if(file)await api.files.write(file,result.bytes);}
      else if(event.id==='provider'){settings.provider=event.value as ProviderId;await refreshCredential();await save();}
      else if(event.id==='mode'){mode=event.value as Mode;await refreshContext();}
      else if(event.id==='model'){settings.models[settings.provider]=String(event.value);await save();}
      else if(event.id==='prompt')prompt=String(event.value??'');
      else if(event.id==='size')size=String(event.value);
      else if(event.id==='quality')quality=String(event.value);
      else if(event.id==='insert')insert=Boolean(event.value);
      else if(event.id==='customBase'||event.id==='customModel'||event.id==='customSizes'||event.id==='customQualities'){settings[event.id]=String(event.value??'');await refreshCredential();await save();}
      else if(event.id==='customMaxEdge'){settings.customMaxEdge=Math.min(8192,Math.max(64,Math.round(Number(event.value)||2048)));await save();}
      else if(event.id==='customEdit'){settings.customEdit=Boolean(event.value);await save();}
    }catch(e){busy=false;error=e instanceof Error?e.message:String(e);}
    await publish();
  };
  subscriptions.push(api.ui.onEvent(onEvent));
  for(const command of ['generate','remove','fill'] as const)subscriptions.push(api.commands.on(command,async()=>{if(!busy){mode=command;error='';await refreshContext();await publish();}}));
  subscriptions.push(api.events.subscribe(event=>{if(event.type==='documentChanged')void refreshContext().then(publish).catch(()=>{});}));
  await refreshCredential();await refreshContext();await publish();
  return {dispose(){disposed=true;for(const subscription of subscriptions)subscription.dispose();void clearResult();}};
}
