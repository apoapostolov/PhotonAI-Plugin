import {build} from 'esbuild';import {readdir,mkdir} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
await mkdir('artifacts/tests',{recursive:true});const files=(await readdir('tests')).filter(f=>f.endsWith('.test.ts'));
await build({entryPoints:files.map(f=>'tests/'+f),outdir:'artifacts/tests',bundle:true,platform:'node',format:'esm',target:'node22',outExtension:{'.js':'.mjs'}});
const run=spawnSync(process.execPath,['--test',...files.map(f=>'artifacts/tests/'+f.replace(/\.ts$/,'.mjs'))],{stdio:'inherit'});process.exitCode=run.status??1;
