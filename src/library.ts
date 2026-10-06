export interface Folder {id:string;name:string;order:number;}
export interface ReferenceImage {id:string;name:string;dataUrl:string;}
export interface PromptItem {id:string;folderId:string;text:string;order:number;createdAt:number;updatedAt:number;stackId?:string|null;}
export interface HistoryItem extends PromptItem {templateName?:string;}
export interface TemplateItem extends PromptItem {name:string;references:ReferenceImage[];transparentBackground?:boolean;}
export interface LibraryState {folders:Folder[];prompts:PromptItem[];history:HistoryItem[];templates:TemplateItem[];templateSeedVersion:number;}
export type TemplateFieldKind='text'|'select'|'radio'|'multi'|'check';
export interface TemplateChoice {label:string;content:string;}
export interface TemplateField {name:string;options:string[];kind?:TemplateFieldKind;choices?:TemplateChoice[];}
export const ROOT_FOLDER='all';
export const REFERENCE_BUDGET=650_000;
export const newId=()=>crypto.randomUUID();
export function emptyLibrary():LibraryState{return {folders:[],prompts:[],history:[],templates:[],templateSeedVersion:0};}
export function cleanLibrary(value:unknown):LibraryState{
  if(!value||typeof value!=='object')return emptyLibrary();const source=value as Partial<LibraryState>;
  const folders=Array.isArray(source.folders)?source.folders.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string').slice(0,100):[];
  const stackId=(item:PromptItem)=>item.stackId===null||typeof item.stackId==='string'&&item.stackId.length<=100?item.stackId:undefined;
  const prompts=Array.isArray(source.prompts)?source.prompts.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(0,2000).map(p=>({...p,stackId:stackId(p)})):[];
  const history=Array.isArray(source.history)?source.history.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(-2000).map(p=>({...p,stackId:stackId(p)})):[];
  const templates=Array.isArray(source.templates)?source.templates.filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string'&&typeof t.name==='string').slice(0,510).map(t=>({...t,stackId:stackId(t),transparentBackground:t.transparentBackground===true,references:Array.isArray(t.references)?t.references.filter(r=>r&&typeof r.dataUrl==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(r.dataUrl)).slice(0,8):[]})):[];
  const templateSeedVersion=typeof source.templateSeedVersion==='number'&&Number.isInteger(source.templateSeedVersion)&&source.templateSeedVersion>=0?source.templateSeedVersion:0;
  return {folders,prompts,history,templates,templateSeedVersion};
}
function parseTemplateField(source:string):TemplateField|undefined{
  const typed=/^([^:|]+)\|(text|select|radio|multi|check)(?::([\s\S]*))?$/i.exec(source);
  if(typed){
    const name=typed[1].trim(),kind=typed[2].toLowerCase() as TemplateFieldKind;
    if(!name)return;
    if(kind==='text')return typed[3]===undefined?{name,options:[],kind}:undefined;
    const parts=(typed[3]??'').split('|');
    if(kind==='check'&&(parts.length>2||!parts[0].trim()))return;
    const choices=parts.map(part=>{
      const arrow=part.indexOf('=>');
      return arrow<0?{label:part.trim(),content:part.trim()}:{label:part.slice(0,arrow).trim(),content:part.slice(arrow+2).trim()};
    });
    if(kind==='check'&&!choices[0].content)return;
    if(kind!=='check'&&choices.some(choice=>!choice.label||!choice.content))return;
    return {name,options:choices.map(choice=>choice.label),kind,choices};
  }
  const legacy=/^([^:|]+)(?::([^{}]+))?$/.exec(source);
  if(!legacy)return;
  const name=legacy[1].trim();if(!name)return;
  return {name,options:legacy[2]?legacy[2].split('|').map(x=>x.trim()).filter(Boolean):[]};
}
export function templateFields(text:string):TemplateField[]{
  const fields=new Map<string,TemplateField>();
  for(const match of text.matchAll(/\{([^{}]+)\}/g)){
    const field=parseTemplateField(match[1]);
    if(field&&!fields.has(field.name))fields.set(field.name,field);
  }
  return [...fields.values()];
}
function choiceIndex(value:string|undefined,count:number):number{
  const index=Number(value);
  return value!==undefined&&Number.isInteger(index)&&index>=0&&index<count?index:0;
}
export function fillTemplate(text:string,values:Record<string,string>):string{
  const fields=new Map(templateFields(text).map(field=>[field.name,field]));
  return text.replace(/\{([^{}]+)\}/g,(whole,tag:string)=>{
    const parsed=parseTemplateField(tag);
    if(!parsed)return whole;
    const field=fields.get(parsed.name)??parsed,value=values[field.name]?.trim();
    if(!field.kind)return value||field.options[0]||'';
    if(field.kind==='text')return value||'';
    const choices=field.choices??[];
    if(field.kind==='check')return choices[value==='true'||value==='1'?0:1]?.content??'';
    if(field.kind==='multi'){
      const selected=new Set((value??'').split(',').filter(Boolean).map(Number).filter(Number.isInteger));
      return choices.filter((_choice,index)=>selected.has(index)).map(choice=>choice.content).filter(Boolean).join(', ');
    }
    return choices[choiceIndex(value,choices.length)]?.content??'';
  });
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
export function recordPrompt(library:LibraryState,text:string,templateName?:string):void{
  const now=Date.now();library.history.push({id:newId(),folderId:ROOT_FOLDER,text,order:now,createdAt:now,updatedAt:now,templateName});
  while(library.history.length>1&&(library.history.length>500||new TextEncoder().encode(JSON.stringify(library)).length>900_000))library.history.shift();
}
export function referenceBytes(library:LibraryState):number{return library.templates.reduce((n,t)=>n+t.references.reduce((m,r)=>m+r.dataUrl.length,0),0);}
