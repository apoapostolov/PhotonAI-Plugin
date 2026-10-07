export interface Folder {id:string;name:string;order:number;}
export interface ReferenceImage {id:string;name:string;dataUrl:string;}
export interface PromptItem {id:string;folderId:string;text:string;order:number;createdAt:number;updatedAt:number;stackId?:string|null;}
export interface HistoryReference {id:string;name:string;key:string;source:'template'|'manual';}
export interface HistoryTemplate {id:string;name:string;text:string;transparentBackground:boolean;values:Record<string,string>;}
export interface HistoryContext {
  mode:'generate'|'remove'|'fill';editAction?:'add'|'change'|'replace';editInstruction?:string;
  provider?:string;model?:string;size?:string;quality?:string;insert?:boolean;
  template?:HistoryTemplate;references:HistoryReference[];
}
export interface HistoryItem extends PromptItem {templateName?:string;context?:HistoryContext;}
export interface TemplateItem extends PromptItem {name:string;references:ReferenceImage[];transparentBackground?:boolean;}
export interface LibraryState {folders:Folder[];prompts:PromptItem[];history:HistoryItem[];templates:TemplateItem[];templateSeedVersion:number;templateSyntaxVersion:number;}
export type TemplateFieldKind='text'|'select'|'radio'|'multi'|'multiselect'|'check';
export interface TemplateChoice {label:string;content:string;}
export interface TemplateField {name:string;options:string[];kind?:TemplateFieldKind;choices?:TemplateChoice[];separator?:string;}
export interface TemplateTag {start:number;end:number;field:TemplateField;}
export const ROOT_FOLDER='all';
export const REFERENCE_BUDGET=650_000;
export const newId=()=>crypto.randomUUID();
export function emptyLibrary():LibraryState{return {folders:[],prompts:[],history:[],templates:[],templateSeedVersion:0,templateSyntaxVersion:2};}
export function cleanLibrary(value:unknown):LibraryState{
  if(!value||typeof value!=='object')return emptyLibrary();const source=value as Partial<LibraryState>;
  const folders=Array.isArray(source.folders)?source.folders.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string').slice(0,100):[];
  const stackId=(item:PromptItem)=>item.stackId===null||typeof item.stackId==='string'&&item.stackId.length<=100?item.stackId:undefined;
  const prompts=Array.isArray(source.prompts)?source.prompts.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(0,2000).map(p=>({...p,stackId:stackId(p)})):[];
  const history=Array.isArray(source.history)?source.history.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(-2000).map(p=>({...p,stackId:stackId(p),context:cleanHistoryContext(p.context)})):[];
  const templates=Array.isArray(source.templates)?source.templates.filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string'&&typeof t.name==='string').slice(0,510).map(t=>({...t,stackId:stackId(t),transparentBackground:t.transparentBackground===true,references:Array.isArray(t.references)?t.references.filter(r=>r&&typeof r.dataUrl==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(r.dataUrl)).slice(0,8):[]})):[];
  const templateSeedVersion=typeof source.templateSeedVersion==='number'&&Number.isInteger(source.templateSeedVersion)&&source.templateSeedVersion>=0?source.templateSeedVersion:0;
  const templateSyntaxVersion=typeof source.templateSyntaxVersion==='number'&&Number.isInteger(source.templateSyntaxVersion)&&source.templateSyntaxVersion>=0?source.templateSyntaxVersion:1;
  return {folders,prompts,history,templates,templateSeedVersion,templateSyntaxVersion};
}
function cleanHistoryContext(value:unknown):HistoryContext|undefined{
  if(!value||typeof value!=='object')return;
  const item=value as Partial<HistoryContext>;
  if(!['generate','remove','fill'].includes(String(item.mode)))return;
  const template=item.template&&typeof item.template==='object'&&typeof item.template.name==='string'&&typeof item.template.text==='string'
    ?{id:typeof item.template.id==='string'?item.template.id:'',name:item.template.name,text:item.template.text,transparentBackground:item.template.transparentBackground===true,values:Object.fromEntries(Object.entries(item.template.values??{}).filter(([key,entry])=>typeof key==='string'&&typeof entry==='string')) as Record<string,string>}
    :undefined;
  const references=Array.isArray(item.references)?item.references.filter(ref=>ref&&typeof ref.id==='string'&&typeof ref.name==='string'&&typeof ref.key==='string'&&(ref.source==='template'||ref.source==='manual')):[];
  return {mode:item.mode!,editAction:['add','change','replace'].includes(String(item.editAction))?item.editAction:undefined,editInstruction:typeof item.editInstruction==='string'?item.editInstruction:undefined,provider:typeof item.provider==='string'?item.provider:undefined,model:typeof item.model==='string'?item.model:undefined,size:typeof item.size==='string'?item.size:undefined,quality:typeof item.quality==='string'?item.quality:undefined,insert:item.insert===true,template,references};
}
function delimiterAt(source:string,delimiter:string):number{
  for(let i=0;i<=source.length-delimiter.length;i++){
    if(source[i]==='\\'&&i+1<source.length){i++;continue;}
    if(source.startsWith(delimiter,i))return i;
  }
  return -1;
}
function splitTag(source:string,delimiter:string):string[]{
  const parts:string[]=[];let rest=source,index=delimiterAt(rest,delimiter);
  while(index>=0){parts.push(rest.slice(0,index));rest=rest.slice(index+delimiter.length);index=delimiterAt(rest,delimiter);}
  parts.push(rest);return parts;
}
function decodeTag(source:string):string{return source.replace(/\\(\\|\||:|=>|\{|\})/g,'$1');}
function parseTemplateField(source:string):TemplateField|undefined{
  const pipe=delimiterAt(source,'|'),firstColon=delimiterAt(source,':');
  if(pipe>=0&&(firstColon<0||pipe<firstColon)){
    const name=decodeTag(source.slice(0,pipe)).trim(),spec=source.slice(pipe+1),colon=delimiterAt(spec,':');
    const kind=decodeTag(colon<0?spec:spec.slice(0,colon)).trim().toLowerCase() as TemplateFieldKind;
    if(!validFieldName(name)||!['text','select','radio','multi','multiselect','check'].includes(kind))return;
    if(kind==='text')return colon<0?{name,options:[],kind}:undefined;
    if(colon<0)return;
    const parts=splitTag(spec.slice(colon+1),'|');
    let separator:string|undefined;
    if(kind==='multiselect'){
      const setting=parts.shift();
      if(!setting?.startsWith('separator='))return;
      separator=decodeTag(setting.slice('separator='.length));
      if(/[\r\n]/.test(separator))return;
    }
    if(!parts.length)return;
    if(kind==='check'&&(parts.length>2||!parts[0].trim()))return;
    const choices=parts.map(part=>{
      const arrow=delimiterAt(part,'=>');
      return arrow<0?{label:decodeTag(part).trim(),content:decodeTag(part).trim()}:{label:decodeTag(part.slice(0,arrow)).trim(),content:decodeTag(part.slice(arrow+2)).trim()};
    });
    if(kind==='check'&&!choices[0].content)return;
    if(kind!=='check'&&choices.some(choice=>!choice.label||!choice.content))return;
    return {name,options:choices.map(choice=>choice.label),kind,choices,separator};
  }
  const colon=firstColon,name=decodeTag(colon<0?source:source.slice(0,colon)).trim();
  if(!validFieldName(name))return;
  return {name,options:colon<0?[]:splitTag(source.slice(colon+1),'|').map(x=>decodeTag(x).trim()).filter(Boolean)};
}
function validFieldName(name:string):boolean{return /^[\p{L}\p{N}][^\r\n{}"]*$/u.test(name);}
// A backslash protects the next character; nested openers leave the tag literal.
function tagEnd(text:string,start:number):number{
  for(let i=start+2;i<text.length-1;i++){
    if(text[i]==='\\'&&i+1<text.length){i++;continue;}
    if(text.startsWith('{{',i))return -1;
    if(text.startsWith('}}',i))return i+2;
  }
  return -1;
}
export function templateTags(text:string):TemplateTag[]{
  const tags:TemplateTag[]=[];
  for(let i=0;i<text.length-1;i++){
    if(!text.startsWith('{{',i))continue;
    let slashes=0;for(let j=i-1;j>=0&&text[j]==='\\';j--)slashes++;
    if(slashes%2)continue;
    const end=tagEnd(text,i);if(end<0)continue;
    const field=parseTemplateField(text.slice(i+2,end-2));
    if(field)tags.push({start:i,end,field});
    i=end-1;
  }
  return tags;
}
export function templateFields(text:string):TemplateField[]{
  const fields=new Map<string,TemplateField>();
  for(const {field} of templateTags(text)){
    if(field&&!fields.has(field.name))fields.set(field.name,field);
  }
  return [...fields.values()];
}
export function migrateTemplateSyntax(library:LibraryState):boolean{
  if(library.templateSyntaxVersion>=2)return false;
  // Preserve saved field behavior while leaving quoted JSON object keys alone.
  for(const template of library.templates)template.text=template.text.replace(/(?<!\{)\{([^{}]+)\}(?!\})/g,(whole,source:string)=>parseTemplateField(source)?`{{${source}}}`:whole);
  library.templateSyntaxVersion=2;
  return true;
}
function choiceIndex(value:string|undefined,count:number):number{
  const index=Number(value);
  return value!==undefined&&Number.isInteger(index)&&index>=0&&index<count?index:0;
}
export function fillTemplate(text:string,values:Record<string,string>):string{
  const fields=new Map(templateFields(text).map(field=>[field.name,field]));
  let filled='',cursor=0;
  const literal=(segment:string)=>segment.replace(/(\\+)\{\{/g,(whole,slashes:string)=>slashes.length%2?slashes.slice(1)+'{{':whole);
  for(const tag of templateTags(text)){
    filled+=literal(text.slice(cursor,tag.start));
    const field=fields.get(tag.field.name)??tag.field,value=values[field.name]?.trim();
    let replacement='';
    if(!field.kind)replacement=value||field.options[0]||'';
    else if(field.kind==='text')replacement=value||'';
    else{
      const choices=field.choices??[];
      if(field.kind==='check')replacement=choices[value==='true'||value==='1'?0:1]?.content??'';
      else if(field.kind==='multi'||field.kind==='multiselect'){
        const selected=new Set((value??'').split(',').filter(Boolean).map(Number).filter(Number.isInteger));
        replacement=choices.filter((_choice,index)=>selected.has(index)).map(choice=>choice.content).filter(Boolean).join(field.kind==='multiselect'?field.separator??', ':', ');
      }else replacement=choices[choiceIndex(value,choices.length)]?.content??'';
    }
    filled+=replacement;cursor=tag.end;
  }
  return filled+literal(text.slice(cursor));
}
const words=(s:string)=>s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
export function similarPrompt(a:string,b:string):boolean{
  const aa=words(a),bb=words(b);if(!aa.length||!bb.length)return false;
  if(Math.abs(aa.length-bb.length)>Math.max(3,Math.floor(Math.max(aa.length,bb.length)*.24)))return false;
  const count=new Map<string,number>();for(const word of aa)count.set(word,(count.get(word)??0)+1);
  let common=0;for(const word of bb){const n=count.get(word)??0;if(n){common++;count.set(word,n-1);}}
  return Math.max(aa.length,bb.length)-common<=Math.max(1,Math.floor(Math.max(aa.length,bb.length)*.28));
}
export function promptStacks<T extends {id:string;text:string;updatedAt:number;stackId?:string|null}>(items:T[]):T[][]{
  const stacks:T[][]=[];for(const item of items){
    const stack=item.stackId===null?undefined:item.stackId?stacks.find(group=>group[0].stackId===item.stackId):stacks.find(group=>group[0].stackId===undefined&&similarPrompt(group[0].text,item.text));
    if(stack)stack.push(item);else stacks.push([item]);
  }return stacks;
}
export function recordPrompt(library:LibraryState,text:string,context?:HistoryContext):HistoryItem{
  const now=Date.now();const item={id:newId(),folderId:ROOT_FOLDER,text,order:now,createdAt:now,updatedAt:now,context};
  library.history.push(item);
  return item;
}
export function referenceBytes(library:LibraryState):number{return library.templates.reduce((n,t)=>n+t.references.reduce((m,r)=>m+r.dataUrl.length,0),0);}
