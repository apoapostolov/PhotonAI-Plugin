import {zipSync} from 'fflate';import {readFile,readdir,writeFile} from 'node:fs/promises';
const files={};for(const name of (await readdir('dist/plugin')).sort())files[name]=new Uint8Array(await readFile('dist/plugin/'+name));
await writeFile('dist/photon-ai-studio-1.0.0.photon-plugin',zipSync(files,{level:6}));console.log('Packaged dist/photon-ai-studio-1.0.0.photon-plugin');
