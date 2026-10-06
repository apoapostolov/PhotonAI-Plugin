// Carry the reviewed 0.1.42 host edits onto a compatible Photon 0.1.43 archive.
// Run after updating Photon, with the editor fully closed. No settings are rewritten.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createReadStream,createWriteStream} from 'node:fs';
import {access,cp,mkdir,open,readFile,rename,stat} from 'node:fs/promises';
import {basename,dirname,isAbsolute,join,resolve,sep} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';

const args=process.argv.slice(2);
function option(name){const index=args.indexOf(name);return index<0?undefined:args[index+1];}
const target=option('--target');
const expected=option('--expected-version')??'0.1.43';
const install=args.includes('--install');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
if(!target||!isAbsolute(target)||args.some(arg=>arg.startsWith('--')&&!['--target','--expected-version','--backup-dir','--data-dir','--install'].includes(arg)))
  throw Error('Usage: node scripts/migrate-photon-asar.mjs --target <absolute 0.1.43 app.asar> [--expected-version 0.1.43] [--backup-dir <absolute path>] [--data-dir <absolute plugin data path>] [--install]');
const asarPath=resolve(target);
const backupDir=resolve(option('--backup-dir')??join(dirname(asarPath),'photon-ai-backups',stamp));
const dataDir=option('--data-dir')?resolve(option('--data-dir')):process.env.APPDATA?join(process.env.APPDATA,'Photon Studio','plugins','data'):undefined;
const stage=asarPath+'.photon-ai-staged-'+stamp;
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pathKey=value=>process.platform==='win32'?value.toLowerCase():value;
const within=(parent,child)=>pathKey(child)===pathKey(parent)||pathKey(child).startsWith(pathKey(parent+sep));
if(!isAbsolute(backupDir)||backupDir===dirname(asarPath)||within(repo,backupDir)||dataDir&&within(dataDir,backupDir))
  throw Error('Choose a backup directory outside the plugin repository and outside the resources directory.');

function running(){
  if(process.platform!=='win32')return false;
  const output=execFileSync('tasklist',['/FI','IMAGENAME eq Photon Studio.exe','/FO','CSV','/NH'],{encoding:'utf8'});
  return /^"Photon Studio\.exe"/im.test(output);
}
if(install&&running())throw Error('Close Photon Studio fully before installing the patched archive.');

const manifest=JSON.parse(await readFile(new URL('./photon-0.1.42-patches.json',import.meta.url),'utf8'));
async function archive(path){
  const file=await open(path,'r');
  try{
    const prefix=Buffer.alloc(16);await file.read(prefix,0,16,0);
    if(prefix.readUInt32LE(0)!==4)throw Error('Not an Electron ASAR: '+path);
    const size=prefix.readUInt32LE(12),padded=(size+3)&~3;
    if(prefix.readUInt32LE(4)!==padded+8||prefix.readUInt32LE(8)!==padded+4)throw Error('Unsupported ASAR header.');
    const headerBytes=Buffer.alloc(size);await file.read(headerBytes,0,size,16);
    return {header:JSON.parse(headerBytes.toString('utf8')),base:16+padded};
  }finally{await file.close();}
}
function entries(node,prefix='',result=[]){
  for(const [name,value] of Object.entries(node.files??{})){
    const path=prefix?prefix+'/'+name:name;
    if(value.files)entries(value,path,result);else result.push({path,entry:value});
  }
  return result;
}
async function readEntry(path,base,entry){
  const file=await open(path,'r');
  try{const bytes=Buffer.alloc(entry.size);await file.read(bytes,0,bytes.length,base+Number(entry.offset));return bytes;}
  finally{await file.close();}
}
function uniqueIndex(text,needle){
  const at=text.indexOf(needle);
  return at>=0&&text.indexOf(needle,at+1)<0?at:-1;
}
function applyEdits(source,edits,label){
  let result=source;
  for(let number=edits.length-1;number>=0;number--){
    const edit=edits[number];let start=-1;
    for(const width of [180,120,80,40]){
      const left=edit.left.slice(-width),right=edit.right.slice(0,width);
      const at=uniqueIndex(result,left+edit.before+right);
      if(at>=0){start=at+left.length;break;}
    }
    if(start<0&&edit.before.length>=40)start=uniqueIndex(result,edit.before);
    if(start<0)throw Error(`${label}: patch hunk ${number+1} of ${edits.length} changed in this Photon release; port this hunk manually from scripts/photon-0.1.42-patches.json. No archive was installed.`);
    result=result.slice(0,start)+edit.after+result.slice(start+edit.before.length);
  }
  return result;
}
const {header,base}=await archive(asarPath);
const all=entries(header);
const find=(pattern,label)=>{
  const found=all.filter(item=>pattern.test(item.path));
  if(found.length!==1)throw Error(`Expected one ${label} in the target ASAR; found ${found.length}. No archive was installed.`);
  return found[0];
};
const packageEntry=find(/^package\.json$/,'package.json');
const packageJson=JSON.parse((await readEntry(asarPath,base,packageEntry.entry)).toString('utf8'));
if(packageJson.version!==expected)throw Error(`Target ASAR is Photon ${packageJson.version}; expected ${expected}. No archive was installed.`);
const files=[
  ['controller',find(/^dist-electron\/electron\/plugins\/controller\.js$/,'plugin controller')],
  ['nativePanel',find(/^dist\/assets\/PhotonNativePanel-[^/]+\.js$/,'native panel bundle')],
  ['nativeCss',find(/^dist\/assets\/PluginManager-[^/]+\.css$/,'native panel stylesheet')]
];
const changes=[];
for(const [key,item] of files){
  const oldBytes=await readEntry(asarPath,base,item.entry),old=oldBytes.toString('utf8');
  if(old.includes('PHOTON_AI_PLUGIN_CONFIG')||old.includes('PHOTON_AI_CUSTOM_DIALOG'))throw Error(`${item.path} already contains a local Photon AI patch. Use an unpatched ${expected} ASAR.`);
  if(key==='controller'&&['method === "config.get"','method === "ui.customDialog"','method === "credentials.store"'].some(needle=>old.includes(needle)))
    throw Error(`${item.path} may already implement a required host capability. Review the new Photon API before applying the local patch.`);
  const patched=applyEdits(old,manifest.files[key].edits,item.path);
  if(createHash('sha256').update(oldBytes).digest('hex')===manifest.files[key].oldSha256&&createHash('sha256').update(patched).digest('hex')!==manifest.files[key].newSha256)
    throw Error(`${item.path}: baseline patch did not reproduce the reviewed result. No archive was installed.`);
  if(key!=='nativeCss'){
    try{execFileSync(process.execPath,['--check','--input-type=module'],{input:patched,stdio:['pipe','pipe','pipe']});}
    catch{throw Error(`${item.path}: patched JavaScript has invalid syntax. No archive was installed.`);}
  }
  changes.push({path:item.path,entry:item.entry,bytes:Buffer.from(patched,'utf8')});
}
// The same private data directory remains in place. Copy it as a local recovery point.
if(dataDir){try{await access(dataDir);}catch{throw Error(`Photon plugin data directory is missing: ${dataDir}. Pass --data-dir with the correct path.`);}}
await mkdir(backupDir,{recursive:true});
if(dataDir)await cp(dataDir,join(backupDir,'plugin-data'),{recursive:true,errorOnExist:true,force:false});
const inputSize=(await stat(asarPath)).size;
let cursor=inputSize-base;
for(const change of changes){
  change.entry.offset=String(cursor);change.entry.size=change.bytes.length;
  const hash=createHash('sha256').update(change.bytes).digest('hex');
  change.entry.integrity={algorithm:'SHA256',hash,blockSize:4194304,blocks:[hash]};
  cursor+=change.bytes.length;
}
const json=Buffer.from(JSON.stringify(header),'utf8'),padded=(json.length+3)&~3;
const prefix=Buffer.alloc(16+padded);prefix.writeUInt32LE(4,0);prefix.writeUInt32LE(padded+8,4);prefix.writeUInt32LE(padded+4,8);prefix.writeUInt32LE(json.length,12);json.copy(prefix,16);
await pipeline(Readable.from((async function*(){yield prefix;for await(const chunk of createReadStream(asarPath,{start:base}))yield chunk;for(const change of changes)yield change.bytes;})()),createWriteStream(stage,{flags:'wx'}));
const checked=await archive(stage);const staged=entries(checked.header);
for(const change of changes){
  const entry=staged.find(item=>item.path===change.path)?.entry;
  if(!entry||entry.size!==change.bytes.length)throw Error('Staged ASAR failed verification: '+change.path);
  const read=await readEntry(stage,checked.base,entry);
  if(!read.equals(change.bytes))throw Error('Staged ASAR failed content verification: '+change.path);
}
if(install){
  if(running())throw Error('Photon Studio started during migration. The staged ASAR remains available; no archive was installed.');
  const backupAsar=join(backupDir,basename(asarPath));
  await rename(asarPath,backupAsar);
  try{await rename(stage,asarPath);}catch(error){await rename(backupAsar,asarPath);throw error;}
  console.log(`Installed Photon AI host patches for Photon ${expected}. Original ASAR and plugin data backup: ${backupDir}`);
}else console.log(`Staged Photon AI host patches for Photon ${expected}: ${stage}\nPlugin data backup: ${backupDir}\nRun again with --install after reviewing the staged archive.`);
