import editPromptConfig from '../config/edit-prompts.json';
import {type LibraryState,type TemplateItem} from './library';

export type EditAction='add'|'change'|'replace';
export const EDIT_PROMPTS_FOLDER='system:edit-prompts';
export const editPromptId=(action:EditAction)=>`edit-prompt:${action}`;
export const isEditPrompt=(id:string)=>id.startsWith('edit-prompt:')&&editPromptConfig.some(item=>item.id===id);

export function ensureEditPrompts(library:LibraryState):boolean{
  let changed=false;
  if(!library.folders.some(folder=>folder.id===EDIT_PROMPTS_FOLDER)){
    library.folders.push({id:EDIT_PROMPTS_FOLDER,name:'Edit Prompts',order:-1});
    changed=true;
  }
  const folder=library.folders.find(item=>item.id===EDIT_PROMPTS_FOLDER)!;
  if(folder.name!=='Edit Prompts'){folder.name='Edit Prompts';changed=true;}
  const now=Date.now();
  for(const [index,item] of editPromptConfig.entries()){
    const existing=library.templates.find(template=>template.id===item.id);
    if(existing){
      if(existing.folderId!==EDIT_PROMPTS_FOLDER){existing.folderId=EDIT_PROMPTS_FOLDER;changed=true;}
      if(existing.name!==item.name){existing.name=item.name;changed=true;}
      continue;
    }
    library.templates.push({...item,folderId:EDIT_PROMPTS_FOLDER,references:[],order:index,createdAt:now,updatedAt:now} satisfies TemplateItem);
    changed=true;
  }
  return changed;
}

export function editPrompt(library:LibraryState,action:EditAction):string{
  const id=editPromptId(action);
  return library.templates.find(item=>item.id===id)?.text.trim()??editPromptConfig.find(item=>item.id===id)!.text;
}
