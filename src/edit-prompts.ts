import editPromptConfig from '../config/edit-prompts.json';
import {type LibraryState,type TemplateItem} from './library';

export type EditAction='add'|'change'|'replace';
export const editActionHints:Record<EditAction,string>={
  add:'Add content within the selection; preserve existing details.',
  change:'Modify the named element within the selection; preserve its other details.',
  replace:'Replace the named element within the selection; keep the surrounding image.'
};
export const EDIT_PROMPTS_FOLDER='system:edit-prompts';
export const editPromptId=(action:EditAction)=>`edit-prompt:${action}`;
export const isEditPrompt=(id:string)=>id.startsWith('edit-prompt:')&&editPromptConfig.some(item=>item.id===id);
const previousDefaults:Record<EditAction,string>={
  add:"Edit only the current selection. Treat everything already visible in the supplied image as the reference to preserve. Add only the element or detail the user requests; do not remove, replace, restyle, or move existing elements. Match the image's scale, perspective, lighting, texture, and shadows. Keep all unrelated content intact.",
  change:"Edit only the current selection. Identify the existing element and the specific change described by the user. Change only that recognized element as requested. Preserve its other properties, every unrelated element, and the original composition. Match the surrounding perspective, lighting, texture, and shadows.",
  replace:"Edit only the current selection. Identify and remove only the element the user names, then replace it with what the user asks for. Retain every other visible element from the supplied image as reference, including their positions and appearance. Blend the replacement with the surrounding scale, perspective, lighting, texture, and shadows."
};

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
      const action=item.id.slice('edit-prompt:'.length) as EditAction;
      if(existing.text===previousDefaults[action]){existing.text=item.text;existing.updatedAt=now;changed=true;}
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
