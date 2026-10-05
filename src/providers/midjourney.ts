import type {Adapter} from './types';import {PluginError} from '@photon/plugin-sdk';
export const midjourney:Adapter={async run(){throw new PluginError('MODEL_UNAVAILABLE','Midjourney does not publish an official image API. Create in the Midjourney app, then bring the image into Photon.');}};
