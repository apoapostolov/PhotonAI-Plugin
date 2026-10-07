import {newId,ROOT_FOLDER,type HistoryContext,type HistoryItem,type LibraryState,type ReferenceImage,type HistoryReference,type TemplateItem} from './library';

export interface HistoryImages {images:Record<string,string>;}
const imageData=(value:unknown):value is string=>typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

export function cleanHistoryImages(value:unknown):HistoryImages{
  const source=value&&typeof value==='object'&&(value as Partial<HistoryImages>).images;
  const images:Record<string,string>={};
  if(source&&typeof source==='object')for(const [key,dataUrl] of Object.entries(source))if(/^[0-9a-f-]{20,80}$/i.test(key)&&imageData(dataUrl))images[key]=dataUrl;
  return {images};
}

export function captureHistoryImages(store:HistoryImages,references:{source:'template'|'manual';image:ReferenceImage}[]):HistoryReference[]{
  const entries=Object.entries(store.images);
  return references.map(({source,image})=>{
    let found=entries.find(([,dataUrl])=>dataUrl===image.dataUrl);
    if(!found){const key=newId();store.images[key]=image.dataUrl;found=[key,image.dataUrl];entries.push(found);}
    return {id:image.id,name:image.name,key:found[0],source};
  });
}

export function captureHistoryContext(store:HistoryImages,input:{mode:HistoryContext['mode'];editAction?:HistoryContext['editAction'];editInstruction?:string;provider:string;model:string;size:string;quality:string;insert:boolean;template?:TemplateItem;values:Record<string,string>;manualReferences:ReferenceImage[]}):HistoryContext{
  const template=input.mode==='remove'?undefined:input.template;
  return {mode:input.mode,editAction:input.mode==='fill'?input.editAction:undefined,editInstruction:input.mode==='fill'?input.editInstruction:undefined,provider:input.provider,model:input.model,size:input.size,quality:input.quality,insert:input.mode==='generate'&&input.insert,template:template?{id:template.id,name:template.name,text:template.text,transparentBackground:!!template.transparentBackground,values:{...input.values}}:undefined,references:captureHistoryImages(store,input.mode==='remove'?[]:[...(template?.references??[]).map(image=>({source:'template' as const,image})),...input.manualReferences.map(image=>({source:'manual' as const,image}))])};
}

export function restoreHistoryImages(store:HistoryImages,item:HistoryItem,source:'template'|'manual'):ReferenceImage[]{
  return (item.context?.references??[]).filter(ref=>ref.source===source&&imageData(store.images[ref.key])).map(ref=>({id:ref.id,name:ref.name,dataUrl:store.images[ref.key]}));
}

export function restoreHistoryTemplate(store:HistoryImages,item:HistoryItem):TemplateItem|undefined{
  const saved=item.context?.template;if(!saved)return;
  return {id:saved.id||'history:'+item.id,folderId:ROOT_FOLDER,name:saved.name,text:saved.text,transparentBackground:saved.transparentBackground,references:restoreHistoryImages(store,item,'template'),order:item.order,createdAt:item.createdAt,updatedAt:item.updatedAt};
}

export function compactHistoryImages(store:HistoryImages,library:LibraryState):boolean{
  const used=new Set(library.history.flatMap(item=>item.context?.references.map(ref=>ref.key)??[]));
  let changed=false;
  for(const key of Object.keys(store.images))if(!used.has(key)){delete store.images[key];changed=true;}
  return changed;
}

export function historyImageBytes(store:HistoryImages):number{return new TextEncoder().encode(JSON.stringify(store)).length;}
