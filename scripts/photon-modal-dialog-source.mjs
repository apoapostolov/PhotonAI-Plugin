// Upgrade the local Photon controller bridge from full-view promotion to a
// separate modal BrowserWindow. The plugin view keeps its broker and state.
const oldDialog=`    // PHOTON_AI_CUSTOM_DIALOG: promote this plugin-owned custom panel above the editor.
    if (method === "ui.customDialog") {
      const entry = i.plugin.entrypoints.find((e) => e.id === i.entrypoint);
      if (entry?.ui !== "custom" || typeof p.open !== "boolean") throw new Error("Invalid custom dialog request.");
      i.dialogOpen = p.open;
      if (p.open) {
        const [width, height] = i.owner.getContentSize();
        i.owner.contentView.addChildView(i.view);
        i.view.setBounds({ x: 0, y: 0, width, height });
        i.view.webContents.focus();
      } else {
        if (i.bounds) i.view.setBounds(i.bounds);
        i.editor.focus();
      }
      return null;
    }`;

const newDialog=`    // PHOTON_AI_CUSTOM_DIALOG_PANEL_PREVIEW: keep the dock visible under a native modal.
    if (method === "ui.customDialog") {
      const entry = i.plugin.entrypoints.find((e) => e.id === i.entrypoint);
      if (entry?.ui !== "custom" || !(typeof p.open === "boolean" || p.ready === true)) throw new Error("Invalid custom dialog request.");
      if (p.ready === true) {
        if (!i.dialogWindow || i.dialogWindow.isDestroyed()) throw new Error("Custom dialog is not open.");
        i.dialogWindow.show();
        i.view.webContents.focus();
        return null;
      }
      if (p.open) {
        if (i.dialogWindow && !i.dialogWindow.isDestroyed()) return null;
        const parent = import_electron2.BrowserWindow.fromWebContents(i.editor) ?? i.owner;
        if (!parent || parent.isDestroyed()) throw new Error("Editor window is closed.");
        const panelImage = await i.view.webContents.capturePage();
        if (panelImage.isEmpty()) throw new Error("Could not preserve the panel while opening the dialog.");
        const preview = new import_electron2.WebContentsView({ webPreferences: {
          sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true
        } });
        preview.setBackgroundColor("#00000000");
        const previewHtml = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden"><img alt="" style="display:block;width:100vw;height:100vh" src="' + panelImage.toDataURL() + '"></body></html>';
        try { await preview.webContents.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(previewHtml)); }
        catch (error) { preview.webContents.close(); throw error; }
        if (i.stopped || i.owner.isDestroyed() || parent.isDestroyed()) { preview.webContents.close(); throw new Error("Panel closed while opening the dialog."); }
        const [availableWidth, availableHeight] = parent.getContentSize();
        let dialogWindow;
        try {
          dialogWindow = new import_electron2.BrowserWindow({
            parent, modal: true, show: false, frame: false, resizable: true,
            minimizable: false, maximizable: false, title: i.plugin.name,
            width: Math.max(280, Math.min(928, availableWidth - 24)),
            height: Math.max(260, Math.min(708, availableHeight - 24)),
            backgroundColor: "#00000000"
          });
        } catch (error) { preview.webContents.close(); throw error; }
        i.dialogPanelVisible = i.view.getVisible();
        i.dialogPlaceholder = preview;
        i.dialogPlaceholderOwner = i.owner;
        i.dialogWindow = dialogWindow;
        i.dialogOpen = true;
        dialogWindow.on("resize", () => {
          if (i.dialogWindow !== dialogWindow || i.view.webContents.isDestroyed()) return;
          const [width, height] = dialogWindow.getContentSize();
          i.view.setBounds({ x: 0, y: 0, width, height });
        });
        dialogWindow.on("close", () => {
          if (i.dialogWindow !== dialogWindow) return;
          if (!i.view.webContents.isDestroyed()) dialogWindow.contentView.removeChildView(i.view);
          if (i.dialogPlaceholder) {
            if (i.dialogPlaceholderOwner && !i.dialogPlaceholderOwner.isDestroyed()) i.dialogPlaceholderOwner.contentView.removeChildView(i.dialogPlaceholder);
            if (!i.dialogPlaceholder.webContents.isDestroyed()) i.dialogPlaceholder.webContents.close();
            i.dialogPlaceholder = void 0;
            i.dialogPlaceholderOwner = void 0;
          }
          i.dialogWindow = void 0;
          i.dialogOpen = false;
          if (!i.owner.isDestroyed() && !i.view.webContents.isDestroyed()) {
            i.owner.contentView.addChildView(i.view);
            if (i.bounds) i.view.setBounds(i.bounds);
            i.view.setVisible(i.dialogPanelVisible !== false);
            if (!i.stopped) {
              i.view.webContents.send("plugins:event", { type: "customDialogClosed" });
              if (!i.editor.isDestroyed()) i.editor.focus();
            }
          }
        });
        i.owner.contentView.addChildView(preview);
        if (i.bounds) preview.setBounds(i.bounds);
        preview.setVisible(true);
        if (!i.owner.isDestroyed()) i.owner.contentView.removeChildView(i.view);
        dialogWindow.contentView.addChildView(i.view);
        const [width, height] = dialogWindow.getContentSize();
        i.view.setBounds({ x: 0, y: 0, width, height });
        i.view.setVisible(true);
      } else if (i.dialogWindow && !i.dialogWindow.isDestroyed()) i.dialogWindow.close();
      return null;
    }`;

function replaceOnce(source,before,after,label){
  const first=source.indexOf(before);
  if(first<0||source.indexOf(before,first+before.length)>=0)throw Error(`Photon controller ${label} changed; no archive was installed.`);
  return source.slice(0,first)+after+source.slice(first+before.length);
}

function addDockPreviewHandling(source){
  source=replaceOnce(source,
    '          if (!instance.dialogWindow && !instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n          if (!instance.dialogWindow) host.contentView.addChildView(instance.view);',
    '          if (instance.dialogWindow && instance.dialogPlaceholder) {\n            if (instance.dialogPlaceholderOwner && !instance.dialogPlaceholderOwner.isDestroyed()) instance.dialogPlaceholderOwner.contentView.removeChildView(instance.dialogPlaceholder);\n            host.contentView.addChildView(instance.dialogPlaceholder);\n            instance.dialogPlaceholderOwner = host;\n          } else {\n            if (!instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n            host.contentView.addChildView(instance.view);\n          }',
    'modal panel owner change');
  source=replaceOnce(source,
    '            if (!instance.dialogWindow) {\n              host.contentView.removeChildView(instance.view);\n              parent.contentView.addChildView(instance.view);\n            }\n            instance.owner = parent;',
    '            if (instance.dialogWindow && instance.dialogPlaceholder) {\n              host.contentView.removeChildView(instance.dialogPlaceholder);\n              parent.contentView.addChildView(instance.dialogPlaceholder);\n              instance.dialogPlaceholderOwner = parent;\n            } else {\n              host.contentView.removeChildView(instance.view);\n              parent.contentView.addChildView(instance.view);\n            }\n            instance.owner = parent;',
    'detached modal panel owner');
  source=replaceOnce(source,
    '        if (instance.dialogWindow && !instance.dialogWindow.isDestroyed()) {\n          const [dialogWidth, dialogHeight]',
    '        if (instance.dialogPlaceholder) instance.dialogPlaceholder.setBounds(instance.bounds);\n        if (instance.dialogWindow && !instance.dialogWindow.isDestroyed()) {\n          const [dialogWidth, dialogHeight]',
    'modal panel bounds');
  return source;
}

export function upgradeCustomDialogSource(source){
  if(source.includes('PHOTON_AI_CUSTOM_DIALOG_PANEL_PREVIEW'))return source;
  if(source.includes('PHOTON_AI_CUSTOM_DIALOG_WINDOW')){
    const start=source.indexOf('    // PHOTON_AI_CUSTOM_DIALOG_WINDOW:');
    const end=source.indexOf('    if (method === "ui.render")',start);
    if(start<0||end<0||source.slice(start,end).indexOf('dialogWindow.show()')<0)throw Error('Photon modal controller changed; no archive was installed.');
    source=source.slice(0,start)+newDialog+'\n'+source.slice(end);
    return addDockPreviewHandling(source);
  }
  source=replaceOnce(source,oldDialog,newDialog,'custom dialog');
  source=replaceOnce(source,
    '    if (!instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n    if (!instance.view.webContents.isDestroyed()) instance.view.webContents.close();',
    '    if (instance.dialogWindow && !instance.dialogWindow.isDestroyed()) instance.dialogWindow.close();\n    if (!instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n    if (!instance.view.webContents.isDestroyed()) instance.view.webContents.close();',
    'plugin stop');
  source=replaceOnce(source,
    '          if (!instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n          host.contentView.addChildView(instance.view);',
    '          if (!instance.dialogWindow && !instance.owner.isDestroyed()) instance.owner.contentView.removeChildView(instance.view);\n          if (!instance.dialogWindow) host.contentView.addChildView(instance.view);',
    'panel host reparent');
  source=replaceOnce(source,
    '            host.contentView.removeChildView(instance.view);\n            parent.contentView.addChildView(instance.view);\n            instance.owner = parent;',
    '            if (!instance.dialogWindow) {\n              host.contentView.removeChildView(instance.view);\n              parent.contentView.addChildView(instance.view);\n            }\n            instance.owner = parent;',
    'detached panel close');
  source=replaceOnce(source,
    '        instance.view.setBounds(instance.dialogOpen ? { x: 0, y: 0, width, height } : instance.bounds);',
    '        if (instance.dialogWindow && !instance.dialogWindow.isDestroyed()) {\n          const [dialogWidth, dialogHeight] = instance.dialogWindow.getContentSize();\n          instance.view.setBounds({ x: 0, y: 0, width: dialogWidth, height: dialogHeight });\n        } else instance.view.setBounds(instance.dialogOpen ? { x: 0, y: 0, width, height } : instance.bounds);',
    'panel bounds');
  source=replaceOnce(source,
    '        instance.view.setVisible(visible && !(instance.plugin.family === "photon" && instance.plugin.entrypoints.find((e) => e.id === instance.entrypoint)?.ui === "native"));',
    '        instance.view.setVisible(Boolean(instance.dialogWindow) || visible && !(instance.plugin.family === "photon" && instance.plugin.entrypoints.find((e) => e.id === instance.entrypoint)?.ui === "native"));',
    'panel visibility');
  source=replaceOnce(source,
    '        if (instance) {\n          instance.view.setVisible(false);\n          clearTimeout(instance.pendingHide);',
    '        if (instance) {\n          if (!instance.dialogWindow) instance.view.setVisible(false);\n          clearTimeout(instance.pendingHide);',
    'panel detach');
  return addDockPreviewHandling(source);
}
