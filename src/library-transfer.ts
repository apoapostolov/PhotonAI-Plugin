import {cleanLibrary,newId,referenceBytes,REFERENCE_BUDGET,ROOT_FOLDER,type HistoryItem,type LibraryState,type PromptItem,type TemplateItem} from './library';
import {cleanHistoryImages,historyImageBytes,type HistoryImages} from './history-images';
import {EDIT_PROMPTS_FOLDER,isEditPrompt} from './edit-prompts';

export type TransferView='saved'|'history'|'templates';
interface TransferEntry {folderName:string|null;item:PromptItem|HistoryItem|TemplateItem;}
interface TransferFile {format:'photon-ai-collection';version:1;view:TransferView;scopeFolderName:string|null;folders:string[];items:TransferEntry[];images:Record<string,string>;}
const MAX_TRANSFER_BYTES=8_000_000;
const counts={saved:2000,history:500,templates:510};
const entries=(library:LibraryState,view:TransferView)=>view==='saved'?library.prompts:view==='history'?library.history:library.templates;
const folderName=(library:LibraryState,id:string)=>id===ROOT_FOLDER?null:library.folders.find(folder=>folder.id===id)?.name??null;
const validName=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=80&&!/[\r\n]/.test(value);
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;

export function exportCollection(library:LibraryState,store:HistoryImages,view:TransferView,folderId:string):{json:string;count:number;folderName:string|null}{
  const selectedFolder=folderId===ROOT_FOLDER?null:library.folders.find(folder=>folder.id===folderId);
  if(folderId!==ROOT_FOLDER&&!selectedFolder)throw new Error('The selected folder no longer exists.');
  const selected=entries(library,view).filter(item=>folderId===ROOT_FOLDER||item.folderId===folderId).slice().sort((a,b)=>view==='history'?b.order-a.order:a.order-b.order);
  const folders=[...new Set(selected.map(item=>folderName(library,item.folderId)).filter((name):name is string=>!!name))];
  if(selectedFolder&&!folders.includes(selectedFolder.name))folders.push(selectedFolder.name);
  const images:Record<string,string>={};
  const items=selected.map(item=>{
    for(const ref of item.context?.references??[]){const dataUrl=store.images[ref.key];if(!dataUrl)throw new Error('A saved image reference is missing. Restore it before exporting this view.');images[ref.key]=dataUrl;}
    return {folderName:folderName(library,item.folderId),item:{id:item.id,folderId:ROOT_FOLDER,text:item.text,order:item.order,createdAt:item.createdAt,updatedAt:item.updatedAt,...(item.stackId!==undefined?{stackId:item.stackId}:{}),...(item.context?{context:item.context}:{}),...(view==='history'&&'templateName'in item?{templateName:item.templateName}:{}),...(view==='templates'?{name:(item as TemplateItem).name,transparentBackground:!!(item as TemplateItem).transparentBackground,references:(item as TemplateItem).references}: {})} as TransferEntry['item']};
  });
  const bundle:TransferFile={format:'photon-ai-collection',version:1,view,scopeFolderName:selectedFolder?.name??null,folders,items,images};
  const json=JSON.stringify(bundle,null,2);
  if(new TextEncoder().encode(json).length>MAX_TRANSFER_BYTES)throw new Error('This export is too large for one file. Export folders separately.');
  return {json,count:items.length,folderName:bundle.scopeFolderName};
}

export function importCollection(library:LibraryState,store:HistoryImages,view:TransferView,json:string):{library:LibraryState;images:HistoryImages;count:number;folderName:string|null}{
  if(new TextEncoder().encode(json).length>MAX_TRANSFER_BYTES)throw new Error('This import file is too large.');
  let parsed:unknown;try{parsed=JSON.parse(json.replace(/^\uFEFF/,''));}catch{throw new Error('Choose a valid Photon AI collection JSON file.');}
  if(!parsed||typeof parsed!=='object')throw new Error('This is not a Photon AI collection file.');
  const file=parsed as Partial<TransferFile>;
  if(file.format!=='photon-ai-collection'||file.version!==1)throw new Error('This is not a supported Photon AI collection file.');
  if(file.view!==view)throw new Error(`This file contains ${file.view??'another view'}. Open its matching collection tab before importing.`);
  if(!Array.isArray(file.items)||file.items.length>counts[view]||!Array.isArray(file.folders)||file.folders.length>100||!file.images||typeof file.images!=='object'||Array.isArray(file.images))throw new Error('The collection file has invalid contents.');
  if(file.scopeFolderName!==null&&file.scopeFolderName!==undefined&&!validName(file.scopeFolderName))throw new Error('The collection file has an invalid folder name.');
  if(file.folders.some(name=>!validName(name)))throw new Error('The collection file has an invalid folder name.');
  const importedImages=cleanHistoryImages({images:file.images});
  const next=structuredClone(library),images:HistoryImages={images:{...store.images}};
  const folderIds=new Map(next.folders.filter(folder=>view==='templates'||folder.id!==EDIT_PROMPTS_FOLDER).map(folder=>[folder.name,folder.id]));
  const names=new Set<string>([...file.folders,...file.items.map(entry=>entry?.folderName).filter((name):name is string=>typeof name==='string')]);
  if(file.scopeFolderName)names.add(file.scopeFolderName);
  for(const name of names){if(!validName(name))throw new Error('The collection file has an invalid folder name.');if(folderIds.has(name))continue;if(next.folders.length>=100)throw new Error('The folder limit is reached. Remove a folder before importing.');const id=name==='Edit Prompts'&&view==='templates'?EDIT_PROMPTS_FOLDER:newId();next.folders.push({id,name,order:next.folders.length});folderIds.set(name,id);}
  const imageKeys=new Map(Object.entries(images.images).map(([key,dataUrl])=>[dataUrl,key]));
  const stackIds=new Map<string,string>();
  const target=entries(next,view);
  const base=Math.max(Date.now(),...target.map(item=>Number.isSafeInteger(item.order)?item.order:0));
  for(const [index,entry] of file.items.entries()){
    if(!entry||typeof entry!=='object'||!('item'in entry)||entry.folderName!==null&&!validName(entry.folderName))throw new Error('The collection file has an invalid card.');
    const source=entry.item;
    if(!source||typeof source!=='object'||typeof source.id!=='string'||!source.id||typeof source.text!=='string')throw new Error('The collection file has an invalid card.');
    if(view==='templates'&&source.context)throw new Error('The collection file has an invalid template context.');
    const cleaned=cleanLibrary({[view==='saved'?'prompts':view]:[source]});
    const item=(view==='saved'?cleaned.prompts:view==='history'?cleaned.history:cleaned.templates)[0];
    if(!item||source.context&&!item.context)throw new Error('The collection file has an invalid prompt context.');
    if(view==='templates'){
      const originalRefs=(source as TemplateItem).references;
      if(!Array.isArray(originalRefs)||originalRefs.length!==(item as TemplateItem).references.length||originalRefs.some(ref=>typeof ref.id!=='string'||typeof ref.name!=='string'||typeof ref.dataUrl!=='string'))throw new Error('The collection file has an invalid template reference.');
    }
    if(source.context){const rawRefs=source.context.references;if(!Array.isArray(rawRefs)||rawRefs.length!==item.context?.references.length)throw new Error('The collection file has an invalid prompt reference.');}
    const folderId=entry.folderName?folderIds.get(entry.folderName)!:ROOT_FOLDER;
    const now=Date.now(),createdAt=Number.isFinite(item.createdAt)&&item.createdAt>=0?item.createdAt:now,updatedAt=Number.isFinite(item.updatedAt)&&item.updatedAt>=0?item.updatedAt:now;
    const stackKey=folderId+':'+item.stackId;
    const stackId=typeof item.stackId==='string'?(stackIds.get(stackKey)??(()=>{const id=newId();stackIds.set(stackKey,id);return id;})()):item.stackId;
    const context=item.context?{...item.context,references:item.context.references.map(ref=>{
      const dataUrl=importedImages.images[ref.key];if(!dataUrl)throw new Error('The collection file is missing an image used by a prompt.');
      let key=imageKeys.get(dataUrl);if(!key){key=newId();images.images[key]=dataUrl;imageKeys.set(dataUrl,key);}
      return {...ref,key};
    })}:undefined;
    const order=base+(view==='history'?file.items.length-index:index+1);
    if(view==='templates'&&isEditPrompt(item.id)){
      if(entry.folderName!=='Edit Prompts')throw new Error('An Edit Prompt must remain in the Edit Prompts folder.');
      const existing=next.templates.find(template=>template.id===item.id);
      if(!existing)throw new Error('The Edit Prompts folder is unavailable. Reload the plugin and try again.');
      existing.text=item.text;existing.updatedAt=now;continue;
    }
    const common={id:newId(),folderId,text:item.text,order,createdAt,updatedAt,...(stackId!==undefined?{stackId}:{}),...(context?{context}:{})};
    if(view==='templates')next.templates.push({...common,name:(item as TemplateItem).name,references:(item as TemplateItem).references,transparentBackground:!!(item as TemplateItem).transparentBackground});
    else if(view==='history')next.history.push({...common,...(typeof (item as HistoryItem).templateName==='string'?{templateName:(item as HistoryItem).templateName}:{})});
    else next.prompts.push(common);
  }
  if(next.prompts.length>2000||next.history.length>500||next.templates.length>510||referenceBytes(next)>REFERENCE_BUDGET||bytes(next)>900_000||historyImageBytes(images)>900_000)throw new Error('The destination library is full. Remove cards or references, then import again.');
  return {library:next,images,count:file.items.length,folderName:file.scopeFolderName??null};
}
