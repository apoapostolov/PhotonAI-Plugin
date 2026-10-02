import {readdir,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import ts from 'typescript';
const folder='artifacts/docs';await mkdir(folder,{recursive:true});
const snippets=[];for(const file of await readdir('docs')){if(!file.endsWith('.md'))continue;const source=await readFile('docs/'+file,'utf8');for(const match of source.matchAll(/```(ts|json)\n([\s\S]*?)```/g)){if(match[1]==='json')JSON.parse(match[2]);else{const target=folder+'/'+file+'-'+snippets.length+'.ts';await writeFile(target,match[2]);snippets.push(target);}}}
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const program=ts.createProgram(snippets,parsed.options);const diagnostics=ts.getPreEmitDiagnostics(program);if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:f=>f,getNewLine:()=>"\n"}));process.exitCode=1;}else console.log('Verified documentation TypeScript examples and JSON against the bundled SDK');
await rm(folder,{recursive:true,force:true});
