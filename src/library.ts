export interface Folder {id:string;name:string;order:number;}
export interface ReferenceImage {id:string;name:string;dataUrl:string;}
export interface PromptItem {id:string;folderId:string;text:string;order:number;createdAt:number;updatedAt:number;}
export interface HistoryItem extends PromptItem {templateName?:string;}
export interface TemplateItem extends PromptItem {name:string;references:ReferenceImage[];transparentBackground?:boolean;}
export interface LibraryState {folders:Folder[];prompts:PromptItem[];history:HistoryItem[];templates:TemplateItem[];templateSeedVersion:number;}
export interface TemplateField {name:string;options:string[];}
export const ROOT_FOLDER='all';
export const REFERENCE_BUDGET=650_000;
export const newId=()=>crypto.randomUUID();
export function emptyLibrary():LibraryState{return {folders:[],prompts:[],history:[],templates:[],templateSeedVersion:0};}
export function cleanLibrary(value:unknown):LibraryState{
  if(!value||typeof value!=='object')return emptyLibrary();const source=value as Partial<LibraryState>;
  const folders=Array.isArray(source.folders)?source.folders.filter(f=>f&&typeof f.id==='string'&&typeof f.name==='string').slice(0,100):[];
  const prompts=Array.isArray(source.prompts)?source.prompts.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(0,2000):[];
  const history=Array.isArray(source.history)?source.history.filter(p=>p&&typeof p.id==='string'&&typeof p.text==='string').slice(-2000):[];
  const templates=Array.isArray(source.templates)?source.templates.filter(t=>t&&typeof t.id==='string'&&typeof t.text==='string'&&typeof t.name==='string').slice(0,510).map(t=>({...t,transparentBackground:t.transparentBackground===true,references:Array.isArray(t.references)?t.references.filter(r=>r&&typeof r.dataUrl==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(r.dataUrl)).slice(0,8):[]})):[];
  const templateSeedVersion=typeof source.templateSeedVersion==='number'&&Number.isInteger(source.templateSeedVersion)&&source.templateSeedVersion>=0?source.templateSeedVersion:0;
  return {folders,prompts,history,templates,templateSeedVersion};
}
export function templateFields(text:string):TemplateField[]{
  const fields=new Map<string,TemplateField>();for(const match of text.matchAll(/\{([^{}:|]+)(?::([^{}]+))?\}/g)){
    const name=match[1].trim();if(!name||fields.has(name))continue;
    fields.set(name,{name,options:match[2]?match[2].split('|').map(x=>x.trim()).filter(Boolean):[]});
  }return [...fields.values()];
}
export function fillTemplate(text:string,values:Record<string,string>):string{return text.replace(/\{([^{}:|]+)(?::([^{}]+))?\}/g,(_whole,name:string,options:string|undefined)=>values[name.trim()]?.trim()||options?.split('|')[0]?.trim()||'');}
const words=(s:string)=>s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
export function similarPrompt(a:string,b:string):boolean{
  const aa=words(a),bb=words(b);if(!aa.length||!bb.length)return false;
  if(Math.abs(aa.length-bb.length)>Math.max(3,Math.floor(Math.max(aa.length,bb.length)*.24)))return false;
  const count=new Map<string,number>();for(const word of aa)count.set(word,(count.get(word)??0)+1);
  let common=0;for(const word of bb){const n=count.get(word)??0;if(n){common++;count.set(word,n-1);}}
  return Math.max(aa.length,bb.length)-common<=Math.max(1,Math.floor(Math.max(aa.length,bb.length)*.28));
}
export function promptStacks<T extends {id:string;text:string;updatedAt:number}>(items:T[]):T[][]{
  const stacks:T[][]=[];for(const item of items){const stack=stacks.find(group=>similarPrompt(group[0].text,item.text));if(stack)stack.push(item);else stacks.push([item]);}return stacks;
}
export function recordPrompt(library:LibraryState,text:string,templateName?:string):void{
  const now=Date.now();library.history.push({id:newId(),folderId:ROOT_FOLDER,text,order:now,createdAt:now,updatedAt:now,templateName});
  while(library.history.length>1&&(library.history.length>500||new TextEncoder().encode(JSON.stringify(library)).length>900_000))library.history.shift();
}
export function referenceBytes(library:LibraryState):number{return library.templates.reduce((n,t)=>n+t.references.reduce((m,r)=>m+r.dataUrl.length,0),0);}
