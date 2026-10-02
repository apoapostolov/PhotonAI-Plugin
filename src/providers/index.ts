import {openai} from './openai';import {gemini} from './gemini';import {together} from './together';import {fal} from './fal';import {replicate} from './replicate';import {bfl} from './bfl';import type {Adapter,ProviderId} from './types';
export const adapters:Record<ProviderId,Adapter>={openai,gemini,together,fal,replicate,bfl,custom:openai};
