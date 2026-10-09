interface HostReply<T>{value?:T;error?:string;}
interface HostBridge{request(method:string,params:Record<string,unknown>):Promise<HostReply<unknown>>;}

function bridge():HostBridge{
  const host=(globalThis as typeof globalThis & {__photonPlugin?:HostBridge}).__photonPlugin;
  if(!host)throw new Error('Photon Studio plugin bridge is unavailable.');
  return host;
}

async function config<T>(method:'get'|'set',id:string,value?:unknown):Promise<T>{
  const reply=await bridge().request('sdk.config.'+method,method==='get'?{id}:{id,value});
  if(reply.error)throw new Error('Photon Studio needs per-plugin configuration file support: '+reply.error);
  return reply.value as T;
}

export const readPluginConfig=<T>(id:string)=>config<T>('get',id);
export const writePluginConfig=(id:string,value:Record<string,unknown>)=>config<void>('set',id,value);
