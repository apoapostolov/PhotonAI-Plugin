import type {PhotonApi,PanelModel,Control,UiEvent} from '@photon/plugin-sdk';
import {ROOT_FOLDER,newId,promptStacks,referenceBytes,REFERENCE_BUDGET,templateFields,type LibraryState,type PromptItem,type TemplateItem,type ReferenceImage} from './library';
import penSvg from '../svg/pen.svg';
import trashSvg from '../svg/trash.svg';
import wandSvg from '../svg/wand-magic-sparkles.svg';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const trashIcon='<span class="glyph-icon" aria-hidden="true">&#x1F5D1;&#xFE0E;</span>';
const cardIcon=(svg:string)=>`<span class="card-action-icon" aria-hidden="true">${svg}</span>`;
function highlightedTemplate(text:string):string{
  let html='',cursor=0;
  for(const match of text.matchAll(/\{[^{}]+\}/g)){
    const index=match.index??0,tag=match[0];
    html+=esc(text.slice(cursor,index));
    html+=templateFields(tag).length?`<span class="template-tag">${esc(tag)}</span>`:esc(tag);
    cursor=index+tag.length;
  }
  return html+esc(text.slice(cursor));
}
const templateFieldHelp=(open:boolean)=>`<section id="template-fields-help" class="template-fields-help" role="region" aria-label="Template field guide" ${open?'':'hidden'}>
  <p>Write tags in a template. When you use it, each tag becomes a control below the prompt. The selected text is added to the hidden instructions sent with your prompt.</p>
  <dl>
    <div><dt>Text field</dt><dd><code>{Subject}</code><span>Type any value.</span></dd></div>
    <div><dt>Dropdown</dt><dd><code>{View|select:Front=>front view|Side=>side view}</code><span>Choose one from a menu.</span></dd></div>
    <div><dt>Radio</dt><dd><code>{Light|radio:Softbox=>soft studio light|Window=>window light}</code><span>Choose one visible option.</span></dd></div>
    <div><dt>Multiple checkboxes</dt><dd><code>{Details|multi:Dew=>dew drops|Leaves=>autumn leaves}</code><span>Choose any number. Their text is combined in the order shown.</span></dd></div>
    <div><dt>Checkbox</dt><dd><code>{Props|check:Add a few props.}</code><span>Unchecked adds nothing.</span></dd></div>
    <div><dt>Checkbox with two states</dt><dd><code>{Grain|check:Add fine grain.|Keep the finish clean.}</code><span>The second text is used when unchecked.</span></dd></div>
  </dl>
  <p>Use <code>Short label=&gt;prompt text</code> to keep a choice short while sending more precise text. Dropdowns and radio groups start on their first option; checkboxes start off. Reuse a field name to reuse its value. Older tags such as <code>{Style:oil|watercolor}</code> still work.</p>
</section>`;
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
      if(c.id?.startsWith('templateOptions:')){
        const radio=c.id.startsWith('templateOptions:radio:');
        return `<fieldset class="template-choice-set"><legend>${label}</legend><div class="template-choice-options">${(c.children??[]).map((option,index)=>`<label class="template-choice"><input type="${radio?'radio':'checkbox'}" name="${esc(c.id)}" data-control="${esc(option.id)}" value="${index}" ${option.value?'checked':''} ${option.disabled?'disabled':''}><span>${esc(option.label)}</span></label>`).join('')}</div></fieldset>`;
      }
      if(c.id==='referenceStrip')return `<div class="reference-strip">${(c.children??[]).map(controlHtml).join('')}<label class="reference-add" title="Add image reference" aria-label="Add image reference">＋<input type="file" accept="image/png,image/jpeg,image/webp" data-manual-reference hidden></label></div>`;
      return `<section class="control-group"><h3>${label}</h3>${(c.children??[]).map(controlHtml).join('')}</section>`;
    case 'text':return `<p class="control-text ${c.tone==='danger'?'danger':''}">${esc(c.text)}</p>`;
    case 'input':return `<label class="field"><span>${label}</span><input data-control="${id}" value="${value}" ${disabled}></label>${c.description?`<small>${esc(c.description)}</small>`:''}`;
    case 'textarea':return c.id==='prompt'
      ? `<div class="field prompt-field"><label for="prompt-input">${label}</label><div class="prompt-input"><textarea id="prompt-input" data-control="${id}" rows="5" ${c.description?'aria-describedby="prompt-save-error"':''} ${disabled}>${esc(c.value)}</textarea><button type="button" class="prompt-save" data-control="savePrompt" title="Save current prompt to Library" aria-label="Save current prompt to Library" ${disabled}><span class="glyph-icon" aria-hidden="true">&#x1F516;&#xFE0E;</span></button></div>${c.description?`<p id="prompt-save-error" class="prompt-save-error" role="alert">${esc(c.description)}</p>`:''}</div>`
      : `<label class="field"><span>${label}</span><textarea data-control="${id}" rows="5" ${disabled}>${esc(c.value)}</textarea></label>`;
    case 'number':return `<label class="field"><span>${label}</span><input type="number" data-control="${id}" value="${value}" min="${c.min??0}" max="${c.max??999999}" ${disabled}></label>`;
    case 'checkbox':return `<div class="template-check-field"><label class="check"><input type="checkbox" data-control="${id}" ${c.value?'checked':''} ${disabled}><span>${label}</span></label>${c.description?`<small>${esc(c.description)}</small>`:''}</div>`;
    case 'select':return `<label class="field"><span class="${c.id==='model'&&c.description?'model-label-row':''}"><span>${label}</span>${c.id==='model'&&c.description?`<span class="model-quota" title="${esc(c.description)}">${esc(c.description)}</span>`:''}</span><select data-control="${id}" ${disabled}>${(c.options??[]).map(o=>`<option value="${esc(o.value)}" ${o.value===c.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`;
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
  let folder=ROOT_FOLDER,tab:'saved'|'history'='saved',expanded=new Set<string>(),editing=new Set<string>(),dragging:string|undefined,templateHelpOpen=false;
  type DeleteTarget={kind:'folder'|'card';id:string;expiresAt:number};
  let folderEditor:string|undefined,armedDelete:DeleteTarget|undefined,deleteTimer:ReturnType<typeof setTimeout>|undefined,notice='';
  const deleteButton=(target:DeleteTarget)=>Array.from(overlay.querySelectorAll<HTMLButtonElement>(target.kind==='folder'?'[data-delete-folder]':'[data-delete]')).find(button=>(target.kind==='folder'?button.dataset.deleteFolder:button.dataset.delete)===target.id);
  const resetDelete=()=>{clearTimeout(deleteTimer);deleteTimer=undefined;if(!armedDelete)return;const button=deleteButton(armedDelete);button?.classList.remove('delete-armed');if(button){const name=armedDelete.kind==='folder'?actions.library.folders.find(item=>item.id===armedDelete?.id)?.name:undefined;button.title=name?'Delete folder':'Delete';button.setAttribute('aria-label',name?'Delete '+name:'Delete');button.removeAttribute('aria-pressed');}armedDelete=undefined;};
  const armDelete=(kind:DeleteTarget['kind'],id:string)=>{resetDelete();armedDelete={kind,id,expiresAt:Date.now()+2000};const button=deleteButton(armedDelete);button?.classList.add('delete-armed');if(button){button.title='Click again to delete';button.setAttribute('aria-label','Click again to delete');button.setAttribute('aria-pressed','true');}deleteTimer=setTimeout(resetDelete,2000);};
  const hide=()=>{resetDelete();void closeCollection().catch(error=>{notice=error instanceof Error?error.message:String(error);render();});};
  const list=()=>kind==='prompts'?actions.library.prompts:actions.library.templates;
  const commit=async()=>{try{await actions.save();notice='';render();}catch(error){notice=error instanceof Error?error.message:String(error);render();}};
  const setTemplateHelp=(open:boolean)=>{templateHelpOpen=open;const help=overlay.querySelector<HTMLElement>('#template-fields-help');if(help)help.hidden=!open;const toggle=overlay.querySelector<HTMLButtonElement>('[data-template-tags]');toggle?.setAttribute('aria-expanded',String(open));toggle?.focus();};
  const card=(item:PromptItem|TemplateItem,history=false)=>{
    const template=kind==='templates'&&!history?item as TemplateItem:undefined;
    const edit=editing.has(item.id);
    const images=template?.references??[];
    return `<article class="card" draggable="true" data-card="${esc(item.id)}">
      <div class="card-top"><span class="drag-handle" title="Drag to reorder" aria-hidden="true">⋮⋮</span>${template?`<strong>${esc(template.name)}</strong>`:`<span class="card-date">${new Date(item.updatedAt).toLocaleString()}</span>`}</div>
      ${edit?`${template?`<label class="sr-only" for="name-${esc(item.id)}">Template name</label><input id="name-${esc(item.id)}" data-edit-name="${esc(item.id)}" value="${esc(template.name)}">`:''}<label class="sr-only" for="text-${esc(item.id)}">${template?'Template':'Prompt'} text</label><textarea id="text-${esc(item.id)}" data-edit-text="${esc(item.id)}" rows="5">${esc(item.text)}</textarea>${template?`<label class="check"><input type="checkbox" data-edit-transparent="${esc(item.id)}" ${template.transparentBackground?'checked':''}> Transparent PNG (OpenAI GPT Image)</label>`:''}`:`<p>${template?highlightedTemplate(item.text):esc(item.text)}</p>${template?.transparentBackground?'<small>Transparent PNG · OpenAI GPT Image</small>':''}`}
      <div class="card-footer">${template?`<div class="card-footer-left"><button type="button" class="add-reference" data-add-ref-button="${esc(item.id)}">＋ Reference</button><input type="file" accept="image/png,image/jpeg,image/webp" data-add-ref="${esc(item.id)}" hidden>${images.map(r=>`<span class="card-reference" title="${esc(r.name)}"><img class="card-reference-thumb" src="${esc(r.dataUrl)}" alt="${esc(r.name)}"><span class="card-reference-preview"><img src="${esc(r.dataUrl)}" alt=""></span><button type="button" aria-label="Remove ${esc(r.name)}" data-remove-ref="${esc(item.id)}" data-ref="${esc(r.id)}">×</button></span>`).join('')}</div>`:'<div></div>'}<div class="card-actions"><button type="button" title="${edit?'Save':'Edit'}" aria-label="${edit?'Save':'Edit'}" data-edit="${esc(item.id)}">${edit?'✓':cardIcon(penSvg)}</button><button type="button" title="Delete" aria-label="Delete" data-delete="${esc(item.id)}">${cardIcon(trashSvg)}</button><button type="button" class="use" title="Use" aria-label="Use" data-use="${esc(item.id)}">${cardIcon(wandSvg)}</button></div></div>
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
    const folderRows=folders.map(f=>folderEditor===f.id?folderInput(f.id,f.name):`<div class="folder-row"><button class="folder ${folder===f.id?'active':''}" data-folder="${esc(f.id)}">${esc(f.name)}</button><button title="Rename folder" aria-label="Rename ${esc(f.name)}" data-rename-folder="${esc(f.id)}">✎</button><button title="Delete folder" aria-label="Delete ${esc(f.name)}" data-delete-folder="${esc(f.id)}">${trashIcon}</button></div>`).join('');
    const toolbar=kind==='prompts'?`<div class="tabs"><button class="${tab==='saved'?'active':''}" data-tab="saved">Saved</button><button class="${tab==='history'?'active':''}" data-tab="history">History</button></div>`:`<button class="add" data-add="true">＋ New Template</button><button type="button" class="template-help-toggle" data-template-tags="true" aria-controls="template-fields-help" aria-expanded="${templateHelpOpen}"><span class="glyph-icon" aria-hidden="true">&#x24D8;</span> Template Fields</button>`;
    overlay.innerHTML=`<div class="modal-backdrop" data-close="true"></div><section class="collection-dialog" role="dialog" aria-modal="true" aria-label="${kind==='prompts'?'Prompt Library':'Templates'}"><header><span class="dialog-title">${kind==='prompts'?'Prompt Library':'Templates'}</span><button class="close" type="button" aria-label="Close" data-close="true">×</button></header>${notice?`<p class="dialog-notice" role="alert">${esc(notice)}</p>`:''}<div class="collection-body"><aside class="folders"><button class="folder ${folder===ROOT_FOLDER?'active':''}" data-folder="${ROOT_FOLDER}">All ${kind==='prompts'?'prompts':'templates'}</button>${folderRows}${folderEditor==='new'?folderInput('new',''):'<button class="new-folder" data-new-folder="true">＋ Folder</button>'}</aside><div class="collection-content"><div class="collection-toolbar">${toolbar}</div>${kind==='templates'?templateFieldHelp(templateHelpOpen):''}<div class="cards">${groups.length?groups.map(group=>{const key=group[0].stackId||group[0].id;return group.length>1?`<section class="stack" data-stack-drop="${esc(key)}"><button class="stack-title" data-stack="${esc(key)}"><span>▤ ${group.length} versions</span><span>${expanded.has(key)?'−':'＋'}</span></button>${card(group[0],tab==='history')}${expanded.has(key)?group.slice(1).map(i=>card(i,tab==='history')).join(''):''}</section>`:card(group[0],tab==='history');}).join(''):`<p class="empty">${tab==='history'?'No prompt history.':kind==='prompts'?'No saved prompts.':'No templates.'}</p>`}<div class="unstack-drop" data-unstack="true">Drop here to separate</div></div></div></div></section>`;
    if(armedDelete){const button=deleteButton(armedDelete);button?.classList.add('delete-armed');if(button){button.title='Click again to delete';button.setAttribute('aria-label','Click again to delete');button.setAttribute('aria-pressed','true');}}
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const el of Array.from(overlay.querySelectorAll<HTMLElement>('[data-card]'))){const before=previous.get(el.dataset.card!);if(!before)continue;const after=el.getBoundingClientRect(),dx=before.left-after.left,dy=before.top-after.top;if(dx||dy)el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'});}
    overlay.querySelector<HTMLElement>('.collection-dialog')?.setAttribute('tabindex','-1');
    (overlay.querySelector<HTMLElement>('[data-folder-name]')??overlay.querySelector<HTMLElement>('.collection-dialog'))?.focus();
  };
  const current=(id:string)=>[...actions.library.prompts,...actions.library.history,...actions.library.templates].find(x=>x.id===id);
  overlay.onclick=async e=>{
    const target=e.target as Element;const button=target.closest<HTMLElement>('[data-close],[data-folder],[data-tab],[data-add],[data-template-tags],[data-stack],[data-edit],[data-delete],[data-use],[data-remove-ref],[data-add-ref-button],[data-new-folder],[data-rename-folder],[data-delete-folder],[data-save-folder],[data-cancel-folder]');
    const repeatedDelete=!!armedDelete&&!!button&&(armedDelete.kind==='card'?button.dataset.delete===armedDelete.id:button.dataset.deleteFolder===armedDelete.id)&&Date.now()<armedDelete.expiresAt;
    if(armedDelete&&!repeatedDelete)resetDelete();
    if(!button)return;
    if(button.dataset.close){hide();return;}
    if(button.dataset.templateTags){setTemplateHelp(!templateHelpOpen);return;}
    if(button.dataset.cancelFolder){folderEditor=undefined;notice='';render();return;}
    if(button.dataset.saveFolder){const id=button.dataset.saveFolder;const input=overlay.querySelector<HTMLInputElement>(`[data-folder-name="${id}"]`);const name=input?.value.trim();if(!name){notice='Enter a folder name.';render();return;}if(id==='new'){const next=newId();actions.library.folders.push({id:next,name,order:Date.now()});folder=next;}else{const found=actions.library.folders.find(x=>x.id===id);if(found)found.name=name;}folderEditor=undefined;await commit();return;}
    if(button.dataset.folder){folder=button.dataset.folder;render();return;}
    if(button.dataset.tab){tab=button.dataset.tab as 'saved'|'history';render();return;}
    if(button.dataset.stack){expanded.has(button.dataset.stack)?expanded.delete(button.dataset.stack):expanded.add(button.dataset.stack);render();return;}
    if(button.dataset.newFolder){folderEditor='new';notice='';render();return;}
    if(button.dataset.renameFolder){folderEditor=button.dataset.renameFolder;notice='';render();return;}
    if(button.dataset.deleteFolder){const id=button.dataset.deleteFolder;if(!repeatedDelete){armDelete('folder',id);return;}resetDelete();actions.library.folders=actions.library.folders.filter(x=>x.id!==id);for(const item of [...actions.library.prompts,...actions.library.history,...actions.library.templates])if(item.folderId===id)item.folderId=ROOT_FOLDER;folder=ROOT_FOLDER;await commit();return;}
    if(button.dataset.addRefButton){const id=button.dataset.addRefButton;Array.from(overlay.querySelectorAll<HTMLInputElement>('[data-add-ref]')).find(input=>input.dataset.addRef===id)?.click();return;}
    if(button.dataset.add&&kind==='templates'){const now=Date.now(),id=newId();actions.library.templates.push({id,folderId:folder,name:'Untitled template',text:'',references:[],order:now,createdAt:now,updatedAt:now});editing.add(id);await commit();return;}
    const id=button.dataset.edit||button.dataset.delete||button.dataset.use||button.dataset.removeRef;if(!id)return;const item=current(id);if(!item)return;
    if(button.dataset.edit){if(editing.has(id)){const text=overlay.querySelector<HTMLTextAreaElement>(`[data-edit-text="${id}"]`);if(text)item.text=text.value.trim();if('name'in item){const name=overlay.querySelector<HTMLInputElement>(`[data-edit-name="${id}"]`);if(name)(item as TemplateItem).name=name.value.trim()||'Untitled template';(item as TemplateItem).transparentBackground=!!overlay.querySelector<HTMLInputElement>(`[data-edit-transparent="${id}"]`)?.checked;}item.updatedAt=Date.now();editing.delete(id);await commit();}else{editing.add(id);render();}return;}
    if(button.dataset.delete){if(!repeatedDelete){armDelete('card',id);return;}resetDelete();for(const key of ['prompts','history','templates'] as const)actions.library[key]=actions.library[key].filter(x=>x.id!==id) as never;await commit();return;}
    if(button.dataset.removeRef&&'references'in item){item.references=(item as TemplateItem).references.filter(r=>r.id!==button.dataset.ref);await commit();return;}
    if(button.dataset.use){if('name'in item)await actions.useTemplate(item as TemplateItem);else await actions.usePrompt(item.text);hide();}
  };
  overlay.onchange=async e=>{const input=e.target as HTMLInputElement;if(!input.dataset.addRef||!input.files?.[0])return;const item=current(input.dataset.addRef) as TemplateItem|undefined;if(!item||!('references'in item))return;try{const image=await smallImage(input.files[0]);if(referenceBytes(actions.library)+image.dataUrl.length>REFERENCE_BUDGET)throw Error('Reference storage is full. Remove an image before adding another.');item.references.push(image);item.updatedAt=Date.now();await commit();}catch(error){notice=error instanceof Error?error.message:String(error);render();}};
  overlay.ondragstart=e=>{
    resetDelete();const card=(e.target as Element).closest<HTMLElement>('[data-card]');dragging=card?.dataset.card;
    if(!dragging)return;
    const entries=tab==='history'?actions.library.history:list();const visible=entries.filter(x=>folder===ROOT_FOLDER||x.folderId===folder).sort((a,b)=>tab==='history'?b.order-a.order:a.order-b.order);
    if(promptStacks(visible).some(group=>group.length>1&&group.some(item=>item.id===dragging)))overlay.classList.add('dragging-stack');
    card?.classList.add('dragging');e.dataTransfer?.setData('text/plain',dragging);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';
  };
  overlay.ondragover=e=>{if((e.target as Element).closest('[data-card],[data-stack-drop],[data-folder],[data-unstack],.cards')){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';}};
  overlay.ondrop=async e=>{
    e.preventDefault();const sourceId=dragging;dragging=undefined;overlay.classList.remove('dragging-stack');overlay.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'));
    if(!sourceId)return;
    const entries=tab==='history'?actions.library.history:list();const from=entries.find(x=>x.id===sourceId);if(!from)return;
    const target=e.target as Element;const destination=target.closest<HTMLElement>('[data-folder]')?.dataset.folder;
    if(destination){from.folderId=destination;from.stackId=null;folder=destination;await commit();return;}
    const visible=entries.filter(x=>folder===ROOT_FOLDER||x.folderId===folder).slice().sort((a,b)=>tab==='history'?b.order-a.order:a.order-b.order);
    const groups=promptStacks(visible);const arranged=groups.flat().filter(item=>item.id!==sourceId);
    const targetCard=target.closest<HTMLElement>('[data-card]');const targetId=targetCard?.dataset.card;
    const targetStack=target.closest<HTMLElement>('[data-stack-drop]')?.dataset.stackDrop;
    if(targetId===sourceId)return;
    const targetGroup=groups.find(group=>targetStack?(group[0].stackId||group[0].id)===targetStack:group.some(item=>item.id===targetId));
    if(!targetGroup&&!target.closest('[data-unstack],.cards'))return;
    if(targetGroup&&targetGroup.length>1){
      const stackId=targetGroup[0].stackId||newId();for(const item of targetGroup)item.stackId=stackId;
      from.stackId=stackId;from.folderId=targetGroup[0].folderId;expanded.add(stackId);
    }else if(targetGroup){from.stackId=null;from.folderId=targetGroup[0].folderId;}
    else from.stackId=null;
    let index=arranged.length;
    if(targetId&&targetId!==sourceId){const at=arranged.findIndex(item=>item.id===targetId);if(at>=0){const rect=targetCard!.getBoundingClientRect();index=at+(e.clientY>rect.top+rect.height/2?1:0);}}
    else if(targetGroup?.length){const last=targetGroup[targetGroup.length-1];const at=arranged.findIndex(item=>item.id===last.id);if(at>=0)index=at+1;}
    arranged.splice(index,0,from);
    let cursor=0;const ordered=folder===ROOT_FOLDER?arranged:entries.slice().sort((a,b)=>tab==='history'?b.order-a.order:a.order-b.order).map(item=>item.folderId===folder?arranged[cursor++]:item);
    ordered.forEach((item,i)=>item.order=tab==='history'?ordered.length-i:i);
    await commit();
  };
  overlay.ondragend=()=>{dragging=undefined;overlay.classList.remove('dragging-stack');overlay.querySelectorAll('.dragging').forEach(x=>x.classList.remove('dragging'));};
  overlay.onkeydown=e=>{const input=e.target as HTMLInputElement;if(e.key==='Enter'&&input.dataset.folderName){e.preventDefault();overlay.querySelector<HTMLButtonElement>(`[data-save-folder="${input.dataset.folderName}"]`)?.click();}else if(e.key==='Escape'){e.preventDefault();if(armedDelete)resetDelete();else if(folderEditor){folderEditor=undefined;render();}else if(templateHelpOpen)setTemplateHelp(false);else hide();}};
  render();
}

async function smallImage(file:File):Promise<ReferenceImage>{
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Choose a PNG, JPEG, or WebP image.');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const dataUrl=canvas.toDataURL('image/jpeg',.78);if(dataUrl.length>240_000)throw Error('This reference is too large after resizing. Choose a smaller image.');
  return {id:newId(),name:file.name.slice(0,100),dataUrl};
}
