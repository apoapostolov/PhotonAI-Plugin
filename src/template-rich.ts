import {templateTags,type TemplateField,type TemplateTag} from './library';

const esc=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export type PillKind='text'|'select'|'radio'|'multi'|'multiselect'|'check'|'check-two';

export function pillKind(field:TemplateField):PillKind{
  if(field.kind==='check')return (field.choices?.length??0)>1?'check-two':'check';
  return field.kind??(field.options.length?'select':'text');
}

const icons:Record<PillKind,string>={text:'T',select:'▾',radio:'◉',multi:'☑',multiselect:'☷',check:'✓','check-two':'◩'};
const names:Record<PillKind,string>={text:'Text field',select:'Dropdown',radio:'Radio',multi:'Checkboxes',multiselect:'Multi-select dropdown',check:'Checkbox','check-two':'Two-state checkbox'};

function pill(tag:TemplateTag,text:string,editable:boolean):string{
  const kind=pillKind(tag.field),source=text.slice(tag.start,tag.end),title=`${names[kind]}: ${tag.field.name}`;
  return `<span class="template-pill template-pill-${kind}" data-template-tag="${esc(source)}" data-pill-kind="${kind}" title="${esc(title)}${editable?' · Double-click to edit':''}" ${editable?'contenteditable="false" role="button" tabindex="0" draggable="true" aria-label="'+esc(title)+'. Double-click or press Enter to edit"':''}><span class="template-pill-icon" aria-hidden="true">${icons[kind]}</span><span class="template-pill-name">${esc(tag.field.name)}</span></span>`;
}

export function templatePillsHtml(text:string,editable=false):string{
  let html='',cursor=0;
  for(const tag of templateTags(text)){
    html+=esc(text.slice(cursor,tag.start))+pill(tag,text,editable);
    cursor=tag.end;
  }
  return html+esc(text.slice(cursor));
}

function serialized(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent??'';
  if(node.nodeType!==Node.ELEMENT_NODE&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return '';
  const element=node as HTMLElement;
  if(element.dataset?.templateTag)return element.dataset.templateTag;
  if(element.tagName==='BR')return '\n';
  let text='';
  for(const child of Array.from(node.childNodes)){
    if((child as HTMLElement).tagName==='DIV'&&text&&!text.endsWith('\n'))text+='\n';
    text+=serialized(child);
  }
  return text;
}

export function richText(root:HTMLElement):string{return serialized(root);}

export function richSelection(root:HTMLElement):{start:number;end:number}{
  const selection=window.getSelection();
  if(!selection?.rangeCount)return {start:richText(root).length,end:richText(root).length};
  const range=selection.getRangeAt(0);
  if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return {start:richText(root).length,end:richText(root).length};
  const before=range.cloneRange();before.selectNodeContents(root);before.setEnd(range.startContainer,range.startOffset);
  const through=range.cloneRange();through.selectNodeContents(root);through.setEnd(range.endContainer,range.endOffset);
  return {start:serialized(before.cloneContents()).length,end:serialized(through.cloneContents()).length};
}

export function richOffsetBefore(root:HTMLElement,node:Node):number{
  let offset=0;
  for(const child of Array.from(root.childNodes)){if(child===node)return offset;offset+=serialized(child).length;}
  return offset;
}

export function setRichSelection(root:HTMLElement,start:number,end=start):void{
  const position=(offset:number):{node:Node;offset:number}=>{
    let cursor=0,index=0;
    for(const child of Array.from(root.childNodes)){
      const size=serialized(child).length;
      if(child.nodeType===Node.TEXT_NODE&&offset<=cursor+size)return {node:child,offset:Math.max(0,offset-cursor)};
      if(offset<=cursor+size)return {node:root,offset:index+(offset>cursor?1:0)};
      cursor+=size;index++;
    }
    return {node:root,offset:root.childNodes.length};
  };
  const first=position(start),last=position(end),range=document.createRange();
  range.setStart(first.node,first.offset);range.setEnd(last.node,last.offset);
  const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);root.focus();
}

export function richOffsetAtPoint(root:HTMLElement,x:number,y:number):number{
  const hit=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-template-tag]');
  if(hit&&root.contains(hit))return richOffsetBefore(root,hit)+(x>hit.getBoundingClientRect().left+hit.getBoundingClientRect().width/2?(hit.dataset.templateTag?.length??0):0);
  const range=document.caretRangeFromPoint(x,y);
  if(!range||!root.contains(range.startContainer))return richText(root).length;
  const before=range.cloneRange();before.selectNodeContents(root);before.setEnd(range.startContainer,range.startOffset);
  return serialized(before.cloneContents()).length;
}
