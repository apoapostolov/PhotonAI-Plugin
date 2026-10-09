import {definePlugin} from '@photon/plugin-sdk';
import {activate} from './plugin';
import {createCustomPanel} from './custom-ui';
import './panel.css';
definePlugin(async api=>{const panel=await createCustomPanel(api);return activate(panel.api,panel);});
