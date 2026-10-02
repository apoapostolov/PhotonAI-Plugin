import {definePlugin} from '@photon/plugin-sdk';
definePlugin(async photon=>{await photon.ui.render('main',{controls:[{type:'text',text:'Run Greet Photon from the Plugins menu.'}]});return photon.commands.on('greet',()=>photon.ui.alert('Hello from a Photon plugin!'));});
