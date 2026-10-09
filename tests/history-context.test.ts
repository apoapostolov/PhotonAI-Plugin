import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanLibrary,emptyLibrary,recordPrompt,type ReferenceImage,type TemplateItem} from '../src/library';
import {captureHistoryContext,cleanHistoryImages,compactHistoryImages,restoreHistoryImages,restoreHistoryTemplate} from '../src/history-images';

test('history keeps the visible prompt and restores template, edit, and reference snapshots',()=>{
  const library=emptyLibrary(),store=cleanHistoryImages({});
  const image:ReferenceImage={id:'ref-template',name:'Product.png',dataUrl:'data:image/png;base64,AAAA'};
  const manual:ReferenceImage={id:'ref-manual',name:'Second.png',dataUrl:image.dataUrl};
  const template:TemplateItem={id:'template-1',folderId:'all',name:'Product edit',text:'Keep {{Subject}} intact.',transparentBackground:false,references:[image],order:0,createdAt:1,updatedAt:1};
  const values={Subject:'the bottle'};
  const context=captureHistoryContext(store,{mode:'fill',editAction:'replace',editInstruction:'Replace only the named object.',provider:'openai',model:'gpt-image-1',size:'1024x1024',quality:'high',insert:false,template,values,manualReferences:[manual]});
  assert.equal(context.references[0].key,context.references[1].key);
  recordPrompt(library,'Replace the cap with a cork.',context);
  template.text='Replace the entire product.';template.references.length=0;values.Subject='something else';
  const reloaded=cleanLibrary(JSON.parse(JSON.stringify(library))),images=cleanHistoryImages(JSON.parse(JSON.stringify(store))),entry=reloaded.history[0];
  assert.equal(entry.text,'Replace the cap with a cork.');
  assert.equal(entry.context?.editAction,'replace');
  assert.equal(entry.context?.editInstruction,'Replace only the named object.');
  assert.deepEqual(entry.context?.template?.values,{Subject:'the bottle'});
  assert.equal(restoreHistoryTemplate(images,entry)?.text,'Keep {{Subject}} intact.');
  assert.deepEqual(restoreHistoryTemplate(images,entry)?.references,[image]);
  assert.deepEqual(restoreHistoryImages(images,entry,'manual'),[manual]);
  reloaded.history.length=0;
  assert.equal(compactHistoryImages(images,reloaded),true);
  assert.deepEqual(images.images,{});
});

test('Remove history does not retain an unrelated selected template or references',()=>{
  const store=cleanHistoryImages({});
  const template:TemplateItem={id:'template-1',folderId:'all',name:'Unused',text:'Ignore this',references:[{id:'ref',name:'Unused.png',dataUrl:'data:image/png;base64,AAAA'}],order:0,createdAt:1,updatedAt:1};
  const context=captureHistoryContext(store,{mode:'remove',provider:'openai',model:'gpt-image-1',size:'1024x1024',quality:'',insert:false,template,values:{},manualReferences:[]});
  assert.equal(context.template,undefined);
  assert.deepEqual(context.references,[]);
  assert.deepEqual(store.images,{});
});
