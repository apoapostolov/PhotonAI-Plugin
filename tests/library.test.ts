import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanLibrary,fillTemplate,promptStacks,recordPrompt,similarPrompt,templateFields} from '../src/library';

test('template fields provide dropdown choices and free text without changing the visible prompt',()=>{
  const context='A {style:oil|watercolor} portrait of {subject} in {style:oil|watercolor}';
  assert.deepEqual(templateFields(context),[{name:'style',options:['oil','watercolor']},{name:'subject',options:[]}]);
  assert.equal(fillTemplate(context,{style:'watercolor',subject:'a fox'}),'A watercolor portrait of a fox in watercolor');
});

test('minor prompt revisions form a stack while different prompts remain separate',()=>{
  const a='A red fox standing in a snowy forest at sunrise';
  const b='A silver fox standing in a snowy forest at sunrise';
  const c='A glass tower beside a crowded city street';
  assert.equal(similarPrompt(a,b),true);
  assert.equal(similarPrompt(a,c),false);
  assert.deepEqual(promptStacks([{id:'a',text:a,updatedAt:1},{id:'b',text:b,updatedAt:2},{id:'c',text:c,updatedAt:3}]).map(group=>group.map(item=>item.id)),[['a','b'],['c']]);
});

test('prompt history records each use and loads with safe empty defaults',()=>{
  const library=cleanLibrary({folders:null,prompts:null,history:null,templates:null});
  recordPrompt(library,'A lighthouse at dawn');recordPrompt(library,'A lighthouse at dusk');
  assert.equal(library.history.length,2);
  assert.notEqual(library.history[0].id,library.history[1].id);
});
