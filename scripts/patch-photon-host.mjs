// Build a Photon Studio ASAR with the editor-wide custom dialog capability.
// Usage: node scripts/patch-photon-host.mjs <input app.asar> <output app.asar>
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {open,stat} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const [input,output]=process.argv.slice(2);
if(!input||!output||input===output)throw Error('Pass different input and output ASAR paths.');

async function archive(path){
  const file=await open(path,'r');
  try{
    const prefix=Buffer.alloc(16);
    await file.read(prefix,0,16,0);
    if(prefix.readUInt32LE(0)!==4)throw Error('Not an Electron ASAR.');
    const length=prefix.readUInt32LE(12),padded=(length+3)&~3;
    if(prefix.readUInt32LE(4)!==padded+8||prefix.readUInt32LE(8)!==padded+4)throw Error('Unsupported ASAR header.');
    const bytes=Buffer.alloc(length);
    await file.read(bytes,0,length,16);
    return {header:JSON.parse(bytes.toString('utf8')),base:16+padded};
  }finally{await file.close();}
}

const {header,base}=await archive(input);
const entry=header.files?.['dist-electron']?.files?.electron?.files?.plugins?.files?.['controller.js'];
if(!entry?.offset||!entry?.size)throw Error('Photon plugin controller not found.');
const handle=await open(input,'r'),original=Buffer.alloc(entry.size);
try{await handle.read(original,0,original.length,base+Number(entry.offset));}finally{await handle.close();}
let source=original.toString('utf8');
if(source.includes('PHOTON_AI_CUSTOM_DIALOG'))throw Error('This ASAR already has the custom dialog patch.');
const marker='    if (method === "ui.theme") return i.theme ?? { name: "dark", tokens: {} };';
if(!source.includes(marker))throw Error('Unknown Photon controller version; patch it from source instead.');
const addition=`\n    // PHOTON_AI_CUSTOM_DIALOG: promote this plugin-owned custom panel above the editor.
    if (method === "ui.customDialog") {
      const entry = i.plugin.entrypoints.find((e) => e.id === i.entrypoint);
      if (entry?.ui !== "custom" || typeof p.open !== "boolean") throw new Error("Invalid custom dialog request.");
      i.dialogOpen = p.open;
      if (p.open) {
        const [width, height] = i.owner.getContentSize();
        i.owner.contentView.addChildView(i.view);
        i.view.setBounds({ x: 0, y: 0, width, height });
        i.view.webContents.focus();
      } else {
        if (i.bounds) i.view.setBounds(i.bounds);
        i.editor.focus();
      }
      return null;
    }`;
source=source.replace(marker,marker+addition);
const patched=Buffer.from(source,'utf8');
const size=(await stat(input)).size;
entry.offset=String(size-base);
entry.size=patched.length;
const digest=createHash('sha256').update(patched).digest('hex');
entry.integrity={algorithm:'SHA256',hash:digest,blockSize:4194304,blocks:[digest]};
const json=Buffer.from(JSON.stringify(header),'utf8'),padded=(json.length+3)&~3;
const prefix=Buffer.alloc(16+padded);
prefix.writeUInt32LE(4,0);
prefix.writeUInt32LE(padded+8,4);
prefix.writeUInt32LE(padded+4,8);
prefix.writeUInt32LE(json.length,12);
json.copy(prefix,16);
await pipeline(Readable.from((async function*(){
  yield prefix;
  for await(const chunk of createReadStream(input,{start:base}))yield chunk;
  yield patched;
})()),createWriteStream(output,{flags:'wx'}));
const check=await archive(output);
const actual=check.header.files['dist-electron'].files.electron.files.plugins.files['controller.js'];
if(actual.size!==patched.length||actual.offset!==entry.offset)throw Error('Patched archive verification failed.');
console.log(`Patched ASAR: ${output}`);
