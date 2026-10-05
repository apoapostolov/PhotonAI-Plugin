import type {PhotonApi,PanelModel,Control,UiEvent} from '@photon/plugin-sdk';
import {ROOT_FOLDER,newId,promptStacks,referenceBytes,REFERENCE_BUDGET,type LibraryState,type PromptItem,type TemplateItem,type ReferenceImage} from './library';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const trashIcon='<span class="glyph-icon" aria-hidden="true">&#x1F5D1;&#xFE0E;</span>';
const sparklesIcon='<span class="glyph-icon" aria-hidden="true">&#x2728;&#xFE0E;</span>';
const root=document.getElementById('app')!;
const overlay=document.getElementById('overlay')!;
type CollectionKind='prompts'|'templates';
export interface CollectionActions {library:LibraryState;save():Promise<void>;usePrompt(text:string):Promise<void>;useTemplate(item:TemplateItem):Promise<void>;}
export interface CustomPanel {api:PhotonApi;openCollection(kind:CollectionKind,actions:CollectionActions):Promise<void>;closeCollection():Promise<void>;}

interface HostReply {value?:unknown;error?:string;}
interface HostBridge {request(method:string,params:Record<string,unknown>):Promise<HostReply>;}
function bridge():HostBridge{
  const host=(globalThis as typeof globalThis & {__photonPlugin?:HostBridge}).__photonPlugin;
  if(!host)throw new Error('Photon Studio plugin bridge is unavailable.');
  return host;
}
function editorDialog(open:boolean):Promise<HostReply>{
  return bridge().request('sdk.ui.customDialog',{open});
}
function applyPhotonTheme(value:unknown):void{
  if(!value||typeof value!=='object')return;
  const theme=value as {name?:unknown;tokens?:unknown};
  if(!theme.tokens||typeof theme.tokens!=='object')return;
  for(const [name,token] of Object.entries(theme.tokens)){
    if(/^--ph-[a-z0-9-]+$/.test(name)&&typeof token==='string')document.documentElement.style.setProperty(name,token);
  }
  if(typeof theme.name==='string'){
    document.documentElement.dataset.photonTheme=theme.name;
    document.documentElement.style.colorScheme=theme.name==='light'||theme.name==='softLight'?'light':'dark';
  }
}

function controlHtml(c:Control):string{
  const id=esc(c.id),label=esc(c.label),value=esc(c.value),disabled=c.disabled?'disabled':'';
  switch(c.type){
    case 'group':
      if(c.id==='promptActions')return `<div class="prompt-actions">${(c.children??[]).map(controlHtml).join('')}</div>`;
      if(c.id==='templateSurface')return `<section class="template-surface"><div class="template-heading"><h3>${label}</h3><button type="button" class="template-remove" data-control="clearTemplate" title="Remove template" aria-label="Remove template">${trashIcon}</button></div>${(c.children??[]).map(controlHtml).join('')}</section>`;
      if(c.id==='referenceStrip')return `<div class="reference-strip">${(c.children??[]).map(controlHtml).join('')}<label class="reference-add" title="Add image reference" aria-label="Add image reference">＋<input type="file" accept="image/png,image/jpeg,image/webp" data-manual-reference hidden></label></div>`;
      return `<section class="control-group"><h3>${label}</h3>${(c.children??[]).map(controlHtml).join('')}</section>`;
    case 'text':return `<p class="control-text ${c.tone==='danger'?'danger':''}">${esc(c.text)}</p>`;
    case 'input':return `<label class="field"><span>${label}</span><input data-control="${id}" value="${value}" ${disabled}></label>${c.description?`<small>${esc(c.description)}</small>`:''}`;
    case 'textarea':return c.id==='prompt'
      ? `<div class="field prompt-field"><label for="prompt-input">${label}</label><div class="prompt-input"><textarea id="prompt-input" data-control="${id}" rows="5" ${disabled}>${esc(c.value)}</textarea><button type="button" class="prompt-save" data-control="savePrompt" title="Save current prompt to Library" aria-label="Save current prompt to Library" ${disabled}><span class="glyph-icon" aria-hidden="true">&#x1F516;&#xFE0E;</span></button></div></div>`
      : `<label class="field"><span>${label}</span><textarea data-control="${id}" rows="5" ${disabled}>${esc(c.value)}</textarea></label>`;
    case 'number':return `<label class="field"><span>${label}</span><input type="number" data-control="${id}" value="${value}" min="${c.min??0}" max="${c.max??999999}" ${disabled}></label>`;
    case 'checkbox':return `<label class="check"><input type="checkbox" data-control="${id}" ${c.value?'checked':''} ${disabled}><span>${label}</span></label>`;
    case 'select':return `<label class="field"><span>${label}</span><select data-control="${id}" ${disabled}>${(c.options??[]).map(o=>`<option value="${esc(o.value)}" ${o.value===c.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    case 'tabs':return `<div class="tabs" role="group" aria-label="${label}">${(c.options??[]).map(o=>`<button type="button" data-control="${id}" data-value="${esc(o.value)}" class="${o.value===c.value?'active':''}" ${disabled}>${esc(o.label)}</button>`).join('')}</div>`;
    case 'button':return `<button type="button" data-control="${id}" class="action ${c.tone==='primary'?'primary':''}" ${disabled}>${label}</button>`;
    case 'image':return c.id?.startsWith('reference:')?`<span class="reference-thumb"><img src="${esc(c.src)}" alt="${label}"><button type="button" data-control="removeReference:${esc(c.id.slice(10))}" aria-label="Remove ${label}">×</button></span>`:`<img class="result-image" alt="${label}" src="${esc(c.src)}">`;
    case 'progress':return `<progress value="${Number(c.value)||0}" max="100"></progress>`;
  }
}

export async function createCustomPanel(base:PhotonApi):Promise<CustomPanel>{
  const theme=await bridge().request('sdk.ui.theme',{});
  if(theme.error)throw new Error(theme.error);
  applyPhotonTheme(theme.value);
  base.events.subscribe(event=>{if(event.type==='theme')applyPhotonTheme(event.theme);});
  let handler:((event:UiEvent)=>void|Promise<void>)|undefined;
  const emit=(id:string,value?:string|number|boolean)=>{void handler?.({id,value,panel:'ai'});};
  root.addEventListener('input',event=>{const el=event.target as HTMLInputElement|HTMLTextAreaElement;if(el.dataset.control==='prompt')emit('prompt',el.value);});
  root.addEventListener('change',event=>{const el=event.target as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;if(!el.dataset.control||el.dataset.control==='prompt')return;emit(el.dataset.control,el.type==='checkbox'?(el as HTMLInputElement).checked:el.type==='number'?Number(el.value):el.value);});
  root.addEventListener('change',async event=>{const el=event.target as HTMLInputElement;if(!el.dataset.manualReference||!el.files?.[0])return;try{emit('manualReference',JSON.stringify(await smallImage(el.files[0])));}catch(error){emit('panelError',error instanceof Error?error.message:String(error));}});
  root.addEventListener('click',event=>{const el=(event.target as Element).closest<HTMLButtonElement>('button[data-control]');if(el)emit(el.dataset.control!,el.dataset.value);});
  const api:PhotonApi={...base,ui:{...base.ui,render:async(_panel:string,model:PanelModel)=>{
    const active=document.activeElement as HTMLInputElement|HTMLTextAreaElement|null;
    const id=active?.dataset?.control,position=active&&'selectionStart'in active?active.selectionStart:null;
    root.innerHTML=`<main class="panel-main">${model.controls.map(controlHtml).join('')}</main>`;
    if(id){const replacement=Array.from(root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-control]')).find(el=>el.dataset.control===id);replacement?.focus();if(position!==null&&replacement&&'setSelectionRange'in replacement)replacement.setSelectionRange(position,position);}
  },onEvent:callback=>{handler=callback;return {dispose(){if(handler===callback)handler=undefined;}};}}};
  const closeCollection=async()=>{
    overlay.hidden=true;overlay.replaceChildren();root.inert=false;
    const reply=await editorDialog(false);
    if(reply?.error)throw new Error(reply.error);
  };
  return {api,async openCollection(kind,actions){
    const reply=await editorDialog(true);
    if(reply?.error)throw new Error(reply.error);
    showCollection(kind,actions,closeCollection);
  },closeCollection};
}

function showCollection(kind:CollectionKind,actions:CollectionActions,closeCollection:()=>Promise<void>):void{
  let folder=ROOT_FOLDER,tab:'saved'|'history'='saved',expanded=new Set<string>(),editing=new Set<string>(),dragging:string|undefined;
  let folderEditor:string|undefined,confirmDelete:{kind:'folder'|'card';id:string}|undefined,notice='';
  const hide=()=>{void closeCollection().catch(error=>{notice=error instanceof Error?error.message:String(error);render();});};
  const list=()=>kind==='prompts'?actions.library.prompts:actions.library.templates;
  const commit=async()=>{try{await actions.save();notice='';render();}catch(error){notice=error instanceof Error?error.message:String(error);render();}};
  const card=(item:PromptItem|TemplateItem,history=false)=>{
    const template=kind==='templates'&&!history?item as TemplateItem:undefined;
    const edit=editing.has(item.id);
    const images=template?.references??[];
    return `<article class="card" draggable="true" data-card="${esc(item.id)}">
      <div class="card-top"><span class="drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>${template?`<strong>${esc(template.name)}</strong>`:`<span class="card-date">${new Date(item.updatedAt).toLocaleString()}</span>`}</div>
      ${edit?`${template?`<label class="sr-only" for="name-${esc(item.id)}">Template name</label><input id="name-${esc(item.id)}" data-edit-name="${esc(item.id)}" value="${esc(template.name)}">`:''}<label class="sr-only" for="text-${esc(item.id)}">${template?'Template':'Prompt'} text</label><textarea id="text-${esc(item.id)}" data-edit-text="${esc(item.id)}" rows="5">${esc(item.text)}</textarea>${template?`<label class="check"><input type="checkbox" data-edit-transparent="${esc(item.id)}" ${template.transparentBackground?'checked':''}> Transparent PNG (OpenAI GPT Image)</label>`:''}`:`<p>${esc(item.text)}</p>${template?.transparentBackground?'<small>Transparent PNG · OpenAI GPT Image</small>':''}`}
      ${images.length?`<div class="reference-strip">${images.map(r=>`<span class="reference-thumb"><img src="${esc(r.dataUrl)}" alt="${esc(r.name)}"><button type="button" aria-label="Remove ${esc(r.name)}" data-remove-ref="${esc(item.id)}" data-ref="${esc(r.id)}">×</button></span>`).join('')}</div>`:''}
      ${template?`<label class="add-reference">＋ Reference<input type="file" accept="image/png,image/jpeg,image/webp" data-add-ref="${esc(item.id)}" hidden></label>`:''}
      <div class="card-actions"><button type="button" title="${edit?'Save':'Edit'}" aria-label="${edit?'Save':'Edit'}" data-edit="${esc(item.id)}">${edit?'✓':'✎'}</button><button type="button" title="Delete" aria-label="Delete" data-delete="${esc(item.id)}">${trashIcon}</button><button type="button" class="use" title="Use" aria-label="Use" data-use="${esc(item.id)}">${sparklesIcon}</button></div>
    </article>`;
  };
  const render=()=>{
    const folders=actions.library.folders.slice().sort((a,b)=>a.order-b.order);
    const source=tab==='history'?actions.library.history:list();
    const visible=source.filter(x=>folder===ROOT_FOLDER||x.folderId===folder).slice().sort((a,b)=>tab==='history'?b.order-a.order:a.order-b.order);
    const groups=promptStacks(visible);
    const previous=new Map(Array.from(overlay.querySelectorAll<HTMLElement>('[data-card]')).map(el=>[el.dataset.card!,el.getBoundingClientRect()]));
    root.inert=true;
    overlay.hidden=false;
    const folderInput=(id:string,name:string)=>`<div class="folder-edit-row"><input data-folder-name="${esc(id)}" aria-label="Folder name" value="${esc(name)}" maxlength="80"><button type="button" data-save-folder="${esc(id)}" title="Save folder" aria-label="Save folder">✓</button><button type="button" data-cancel-folder="true" title="Cancel" aria-label="Cancel">×</button></div>`;
    const folderRows=folders.map(f=>folderEditor===f.id?folderInput(f.id,f.name):`<div class="folder-row"><button class="folder ${folder===f.id?'active':''}" data-folder="${esc(f.id)}">${esc(f.name)}</button><button title="Rename folder" aria-label="Rename ${esc(f.name)}" data-rename-folder="${esc(f.id)}">✎</button><button title="Delete folder" aria-label="Delete ${esc(f.name)}" data-delete-folder="${esc(f.id)}">×</button></div>`).join('');
    const toolbar=kind==='prompts'?`<div class="tabs"><button class="${tab==='saved'?'active':''}" data-tab="saved">Saved</button><button class="${tab==='history'?'active':''}" data-tab="history">History</button></div>`:'<button class="add" data-add="true">＋ New template</button>';
    const confirmation=confirmDelete?`<div class="inline-confirm"><span>${confirmDelete.kind==='folder'?'Delete folder? Its cards will move to All.':'Delete this card?'}</span><button type="button" data-confirm-delete="true">Delete</button><button type="button" data-cancel-delete="true">Cancel</button></div>`:'';
    overlay.innerHTML=`<div class="modal-backdrop" data-close="true"></div><section class="collection-dialog" role="dialog" aria-modal="true" aria-label="${kind==='prompts'?'Prompt Library':'Templates'}"><header><span class="dialog-title">${kind==='prompts'?'Prompt Library':'Templates'}</span><button class="close" type="button" aria-label="Close" data-close="true">×</button></header>${notice?`<p class="dialog-notice" role="alert">${esc(notice)}</p>`:''}${confirmation}<div class="collection-body"><aside class="folders"><button class="folder ${folder===ROOT_FOLDER?'active':''}" data-folder="${ROOT_FOLDER}">All ${kind==='prompts'?'prompts':'templates'}</button>${folderRows}${folderEditor==='new'?folderInput('new',''):'<button class="new-folder" data-new-folder="true">＋ Folder</button>'}</aside><div class="collection-content"><div class="collection-toolbar">${toolbar}</div><div class="cards">${groups.length?groups.map(group=>group.length>1?`<section class="stack"><button class="stack-title" data-stack="${esc(group[0].id)}"><span>▤ ${group.length} versions</span><span>${expanded.has(group[0].id)?'−':'＋'}</span></button>${card(group[0],tab==='history')}${expanded.has(group[0].id)?group.slice(1).map(i=>card(i,tab==='history')).join(''):''}</section>`:card(group[0],tab==='history')).join(''):`<p class="empty">${tab==='history'?'No prompt history.':kind==='prompts'?'No saved prompts.':'No templates.'}</p>`}</div></div></div></section>`;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const el of Array.from(overlay.querySelectorAll<HTMLElement>('[data-card]'))){const before=previous.get(el.dataset.card!);if(!before)continue;const after=el.getBoundingClientRect(),dx=before.left-after.left,dy=before.top-after.top;if(dx||dy)el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'});}
    overlay.querySelector<HTMLElement>('.collection-dialog')?.setAttribute('tabindex','-1');
    (overlay.querySelector<HTMLElement>('[data-folder-name],[data-confirm-delete]')??overlay.querySelector<HTMLElement>('.collection-dialog'))?.focus();
  };
  const current=(id:string)=>[...actions.library.prompts,...actions.library.history,...actions.library.templates].find(x=>x.id===id);
  overlay.onclick=async e=>{
    const target=e.target as Element;const button=target.closest<HTMLElement>('[data-close],[data-folder],[data-tab],[data-add],[data-stack],[data-edit],[data-delete],[data-use],[data-remove-ref],[data-new-folder],[data-rename-folder],[data-delete-folder],[data-save-folder],[data-cancel-folder],[data-confirm-delete],[data-cancel-delete]');if(!button)return;
    if(button.dataset.close){hide();return;}
    if(button.dataset.cancelFolder){folderEditor=undefined;notice='';render();return;}
    if(button.dataset.saveFolder){const id=button.dataset.saveFolder;const input=overlay.querySelector<HTMLInputElement>(`[data-folder-name="${id}"]`);const name=input?.value.trim();if(!name){notice='Enter a folder name.';render();return;}if(id==='new'){const next=newId();actions.library.folders.push({id:next,name,order:Date.now()});folder=next;}else{const found=actions.library.folders.find(x=>x.id===id);if(found)found.name=name;}folderEditor=undefined;await commit();return;}
    if(button.dataset.cancelDelete){confirmDelete=undefined;render();return;}
    if(button.dataset.confirmDelete&&confirmDelete){const pending=confirmDelete;confirmDelete=undefined;if(pending.kind==='folder'){actions.library.folders=actions.library.folders.filter(x=>x.id!==pending.id);for(const x of [...actions.library.prompts,...actions.library.history,...actions.library.templates])if(x.folderId===pending.id)x.folderId=ROOT_FOLDER;folder=ROOT_FOLDER;}else{for(const key of ['prompts','history','templates'] as const)actions.library[key]=actions.library[key].filter(x=>x.id!==pending.id) as never;}await commit();return;}
    if(button.dataset.folder){folder=button.dataset.folder;render();return;}
    if(button.dataset.tab){tab=button.dataset.tab as 'saved'|'history';render();return;}
    if(button.dataset.stack){expanded.has(button.dataset.stack)?expanded.delete(button.dataset.stack):expanded.add(button.dataset.stack);render();return;}
    if(button.dataset.newFolder){folderEditor='new';notice='';render();return;}
    if(button.dataset.renameFolder){folderEditor=button.dataset.renameFolder;notice='';render();return;}
    if(button.dataset.deleteFolder){confirmDelete={kind:'folder',id:button.dataset.deleteFolder};render();return;}
    if(button.dataset.add&&kind==='templates'){const now=Date.now(),id=newId();actions.library.templates.push({id,folderId:folder,name:'Untitled template',text:'',references:[],order:now,createdAt:now,updatedAt:now});editing.add(id);await commit();return;}
    const id=button.dataset.edit||button.dataset.delete||button.dataset.use||button.dataset.removeRef;if(!id)return;const item=current(id);if(!item)return;
    if(button.dataset.edit){if(editing.has(id)){const text=overlay.querySelector<HTMLTextAreaElement>(`[data-edit-text="${id}"]`);if(text)item.text=text.value.trim();if('name'in item){const name=overlay.querySelector<HTMLInputElement>(`[data-edit-name="${id}"]`);if(name)(item as TemplateItem).name=name.value.trim()||'Untitled template';(item as TemplateItem).transparentBackground=!!overlay.querySelector<HTMLInputElement>(`[data-edit-transparent="${id}"]`)?.checked;}item.updatedAt=Date.now();editing.delete(id);await commit();}else{editing.add(id);render();}return;}
    if(button.dataset.delete){confirmDelete={kind:'card',id};render();return;}
    if(button.dataset.removeRef&&'references'in item){item.references=(item as TemplateItem).references.filter(r=>r.id!==button.dataset.ref);await commit();return;}
    if(button.dataset.use){if('name'in item)await actions.useTemplate(item as TemplateItem);else await actions.usePrompt(item.text);hide();}
  };
  overlay.onchange=async e=>{const input=e.target as HTMLInputElement;if(!input.dataset.addRef||!input.files?.[0])return;const item=current(input.dataset.addRef) as TemplateItem|undefined;if(!item||!('references'in item))return;try{const image=await smallImage(input.files[0]);if(referenceBytes(actions.library)+image.dataUrl.length>REFERENCE_BUDGET)throw Error('Reference storage is full. Remove an image before adding another.');item.references.push(image);item.updatedAt=Date.now();await commit();}catch(error){notice=error instanceof Error?error.message:String(error);render();}};
  overlay.ondragstart=e=>{const card=(e.target as Element).closest<HTMLElement>('[data-card]');dragging=card?.dataset.card;card?.classList.add('dragging');};
  overlay.ondragover=e=>{if((e.target as Element).closest('[data-card],[data-folder]'))e.preventDefault();};
  overlay.ondrop=async e=>{e.preventDefault();if(!dragging)return;const entries=tab==='history'?actions.library.history:list();const from=entries.find(x=>x.id===dragging);if(!from)return;const destination=(e.target as Element).closest<HTMLElement>('[data-folder]')?.dataset.folder;if(destination){from.folderId=destination;folder=destination;await commit();return;}const target=(e.target as Element).closest<HTMLElement>('[data-card]')?.dataset.card;if(!target||target===dragging)return;const to=entries.find(x=>x.id===target);if(!to)return;from.folderId=to.folderId;const ordered=entries.filter(x=>x.folderId===to.folderId).sort((a,b)=>a.order-b.order).filter(x=>x.id!==from.id);ordered.splice(ordered.findIndex(x=>x.id===to.id),0,from);ordered.forEach((x,i)=>x.order=i);await commit();};
  overlay.ondragend=()=>{dragging=undefined;overlay.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'));};
  overlay.onkeydown=e=>{const input=e.target as HTMLInputElement;if(e.key==='Enter'&&input.dataset.folderName){e.preventDefault();overlay.querySelector<HTMLButtonElement>(`[data-save-folder="${input.dataset.folderName}"]`)?.click();}else if(e.key==='Escape'){e.preventDefault();if(folderEditor){folderEditor=undefined;render();}else if(confirmDelete){confirmDelete=undefined;render();}else hide();}};
  render();
}

async function smallImage(file:File):Promise<ReferenceImage>{
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Choose a PNG, JPEG, or WebP image.');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const dataUrl=canvas.toDataURL('image/jpeg',.78);if(dataUrl.length>240_000)throw Error('This reference is too large after resizing. Choose a smaller image.');
  return {id:newId(),name:file.name.slice(0,100),dataUrl};
}
