import {ROOT_FOLDER,type LibraryState,type TemplateItem} from './library';
import premadeConfig from '../config/premade-templates.json';

// Versioned once-per-library so a deleted or edited starter card stays deleted or edited.
const SEED_VERSION=3;
const ORIGINAL_TEMPLATE_COUNT=10;
const premade:Pick<TemplateItem,'id'|'name'|'text'|'transparentBackground'>[]=premadeConfig;

export function seedPremadeTemplates(library:LibraryState):boolean{
  if(library.templateSeedVersion>=SEED_VERSION)return false;
  const now=Date.now();
  let nextOrder=library.templates.reduce((max,item)=>Number.isFinite(item.order)?Math.max(max,item.order):max,-1)+1;
  for(const [index,item] of premade.entries()){
    const existing=library.templates.find(template=>template.id===item.id);
    if(existing){
      if(library.templateSeedVersion===1&&existing.createdAt===existing.updatedAt&&existing.name===item.name)existing.text=item.text;
      continue;
    }
    if(library.templateSeedVersion<1||library.templateSeedVersion<3&&index>=ORIGINAL_TEMPLATE_COUNT)library.templates.push({...item,folderId:ROOT_FOLDER,references:[],order:library.templateSeedVersion<1?index:nextOrder++,createdAt:now,updatedAt:now});
  }
  library.templateSeedVersion=SEED_VERSION;
  return true;
}
