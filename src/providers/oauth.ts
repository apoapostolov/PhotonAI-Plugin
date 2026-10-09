import {PluginError} from '@photon/plugin-sdk';
import type {AdapterContext} from './types';
import {raw,request,wait} from './common';
export type OAuthProvider='codex'|'grok';
export interface OAuthSession {accessToken:string;refreshToken?:string;expiresAt?:number;accountId?:string;tokenEndpoint?:string;}
export interface DeviceLogin {provider:OAuthProvider;userCode:string;verificationUri:string;deviceCode:string;interval:number;deadline:number;tokenEndpoint?:string;}
const CODEX_CLIENT='app_EMoamEEZ73f0CkXaXp7hrann';
const XAI_CLIENT='b1a00492-073a-47ea-816f-4c329264a828';
const XAI_SCOPE='openid profile email offline_access grok-cli:access api:access';
const text=(value:any,key:string)=>typeof value?.[key]==='string'?value[key]:'';
const seconds=(value:any,key:string,fallback:number)=>{const n=Number(value?.[key]);return Number.isFinite(n)&&n>0?n:fallback;};
export function accountIdFromToken(token:string):string|undefined{try{const part=token.split('.')[1];if(!part)return;const json=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));const id=json?.['https://api.openai.com/auth']?.chatgpt_account_id;return typeof id==='string'&&id?id:undefined;}catch{return undefined;}}
function session(value:any,tokenEndpoint?:string):OAuthSession{const accessToken=text(value,'access_token');if(!accessToken)throw new PluginError('AUTHENTICATION','The provider did not issue an access token. Sign in again.');const expires=seconds(value,'expires_in',0);const refresh=text(value,'refresh_token');return {accessToken,refreshToken:refresh||undefined,expiresAt:expires?Date.now()+expires*1000:undefined,accountId:accountIdFromToken(text(value,'id_token')||accessToken),tokenEndpoint};}
function deviceUri(value:string){return value.replace('https://auth.x.ai/oauth2/device','https://accounts.x.ai/oauth2/device').replace('http://auth.x.ai/oauth2/device','https://accounts.x.ai/oauth2/device');}
export async function startDeviceLogin(context:AdapterContext,provider:OAuthProvider,onStatus?:(line:string)=>void):Promise<DeviceLogin>{onStatus?.('Requesting a sign-in code…');
 if(provider==='codex'){const body=await request<any>(context,{url:'https://auth.openai.com/api/accounts/deviceauth/usercode',method:'POST',json:{client_id:CODEX_CLIENT}},false);const userCode=text(body,'user_code')||text(body,'usercode'),deviceCode=text(body,'device_auth_id');if(!userCode||!deviceCode)throw new PluginError('AUTHENTICATION','Device sign-in could not start. Check whether device authorization is enabled for this account.');return {provider,userCode,verificationUri:'https://auth.openai.com/codex/device',deviceCode,interval:Math.min(30,Math.max(1,seconds(body,'interval',5))),deadline:Date.now()+Math.min(900,Math.max(60,seconds(body,'expires_in',900)))*1000};}
 const discovery=await request<any>(context,{url:'https://auth.x.ai/.well-known/openid-configuration'},false);const tokenEndpoint=text(discovery,'token_endpoint');if(!tokenEndpoint.startsWith('https://')||!tokenEndpoint.includes('x.ai'))throw new PluginError('AUTHENTICATION','xAI discovery did not return a token endpoint.');
 const body=await request<any>(context,{url:'https://auth.x.ai/oauth2/device/code',method:'POST',form:{client_id:XAI_CLIENT,scope:XAI_SCOPE}},false);const userCode=text(body,'user_code'),deviceCode=text(body,'device_code'),verificationUri=deviceUri(text(body,'verification_uri'));if(!userCode||!deviceCode||!verificationUri.startsWith('https://'))throw new PluginError('AUTHENTICATION','Device sign-in could not start. Check whether device authorization is enabled for this account.');return {provider,userCode,verificationUri,deviceCode,interval:Math.max(1,seconds(body,'interval',5)),deadline:Date.now()+Math.min(900,Math.max(60,seconds(body,'expires_in',900)))*1000,tokenEndpoint};}
export async function completeDeviceLogin(context:AdapterContext,pending:DeviceLogin,onStatus?:(line:string)=>void):Promise<OAuthSession>{let interval=pending.interval;
 while(Date.now()<pending.deadline){onStatus?.('Waiting for approval…');const polled=pending.provider==='codex'
  ?await raw<any>(context,{url:'https://auth.openai.com/api/accounts/deviceauth/token',method:'POST',json:{device_auth_id:pending.deviceCode,user_code:pending.userCode}},false)
  :await raw<any>(context,{url:pending.tokenEndpoint??'https://auth.x.ai/oauth2/token',method:'POST',form:{client_id:XAI_CLIENT,device_code:pending.deviceCode,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}},false);
  const error=text(polled.body,'error');
  if(error==='access_denied'||error==='expired_token')throw new PluginError('AUTHENTICATION','Sign-in was declined or expired. Try again.');
  if(polled.status===429||error==='slow_down')interval=Math.min(30,interval+5);
  if(polled.status===429||error==='slow_down'||error==='authorization_pending'||pending.provider==='codex'&&(polled.status===403||polled.status===404)){await wait(context,interval*1000);continue;}
  if(polled.status<200||polled.status>=300)throw new PluginError('AUTHENTICATION','The provider could not complete sign-in. Try again.');
  if(pending.provider==='codex'&&text(polled.body,'authorization_code')){const exchanged=await request<any>(context,{url:'https://auth.openai.com/oauth/token',method:'POST',form:{grant_type:'authorization_code',code:text(polled.body,'authorization_code'),code_verifier:text(polled.body,'code_verifier'),redirect_uri:'https://auth.openai.com/deviceauth/callback',client_id:CODEX_CLIENT}},false);onStatus?.('Signed in.');return session(exchanged);}
  if(text(polled.body,'access_token')){onStatus?.('Signed in.');return session(polled.body,pending.tokenEndpoint);}
  await wait(context,interval*1000);
 }
 throw new PluginError('TIMEOUT','Sign-in timed out. Try again.');}
export async function refreshSession(context:AdapterContext,provider:OAuthProvider,current:OAuthSession):Promise<OAuthSession>{if(!current.refreshToken)return current;const endpoint=provider==='codex'?'https://auth.openai.com/oauth/token':current.tokenEndpoint??'https://auth.x.ai/oauth2/token';const client=provider==='codex'?CODEX_CLIENT:XAI_CLIENT;const body=await request<any>(context,{url:endpoint,method:'POST',form:{grant_type:'refresh_token',refresh_token:current.refreshToken,client_id:client}});const next=session(body,current.tokenEndpoint??endpoint);if(!next.refreshToken)next.refreshToken=current.refreshToken;if(!next.accountId)next.accountId=current.accountId;return next;}
