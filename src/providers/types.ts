import type {PhotonApi,JobContext} from '@photon/plugin-sdk';
export type Mode='generate'|'remove'|'fill';
export type ProviderId='openai'|'codex'|'gemini'|'midjourney'|'ideogram'|'bfl'|'fal'|'replicate'|'together'|'xai'|'grok'|'custom';
export interface Model {id:string;label:string;generate:boolean;edit:'mask'|'prompt'|false;maxEdge:number;sizes?:string[];qualities?:string[];}
export interface Provider {id:ProviderId;label:string;origin:string;models:Model[];}
export interface ImageInput {png:Uint8Array;whiteMask:Uint8Array;alphaMask:Uint8Array;width:number;height:number;}
export interface GenerateRequest {provider:ProviderId;model:string;mode:Mode;prompt:string;size:string;quality:string;source?:ImageInput;baseUrl?:string;accessToken?:string;accountId?:string;}
export interface AdapterContext {api:PhotonApi;job:JobContext;credential:string;}
export interface Adapter {run(context:AdapterContext,request:GenerateRequest):Promise<Uint8Array>;}
