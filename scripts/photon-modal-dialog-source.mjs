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

const newDialog=`    // PHOTON_AI_CUSTOM_DIALOG_WINDOW: keep the plugin view in a separate native modal.
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
        const [availableWidth, availableHeight] = parent.getContentSize();
        const dialogWindow = new import_electron2.BrowserWindow({
          parent, modal: true, show: false, frame: false, resizable: true,
          minimizable: false, maximizable: false, title: i.plugin.name,
          width: Math.max(280, Math.min(928, availableWidth - 24)),
          height: Math.max(260, Math.min(708, availableHeight - 24)),
          backgroundColor: "#00000000"
        });
        i.dialogPanelVisible = i.view.getVisible();
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

export function upgradeCustomDialogSource(source){
  if(source.includes('PHOTON_AI_CUSTOM_DIALOG_WINDOW'))return source;
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
  return source;
}
