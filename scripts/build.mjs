import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist/plugin',{recursive:true});
await build({entryPoints:['src/index.ts'],outfile:'dist/plugin/plugin.js',bundle:true,format:'iife',platform:'browser',target:'es2022',sourcemap:true});
await copyFile('photon.plugin.json','dist/plugin/photon.plugin.json');
await writeFile('dist/plugin/index.html','<!doctype html><html><head><meta charset="utf-8"><title>Photon AI Studio</title></head><body><script src="plugin.js"></script></body></html>');
console.log('Built installable folder: dist/plugin');
