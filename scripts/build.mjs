import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('dist/plugin',{recursive:true});
await build({entryPoints:['src/index.ts'],outfile:'dist/plugin/plugin.js',bundle:true,format:'iife',platform:'browser',target:'es2022',sourcemap:true,loader:{'.css':'css','.svg':'text'}});
await copyFile('photon.plugin.json','dist/plugin/photon.plugin.json');
await copyFile('LICENSE','dist/plugin/LICENSE');
await copyFile('THIRD_PARTY_NOTICES.txt','dist/plugin/THIRD_PARTY_NOTICES.txt');
await writeFile('dist/plugin/index.html','<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photon AI Studio</title><link rel="stylesheet" href="plugin.css"></head><body><div id="app"></div><div id="overlay" hidden></div><script src="plugin.js"></script></body></html>');
console.log('Built installable folder: dist/plugin');
