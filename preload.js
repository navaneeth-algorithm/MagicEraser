const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('magicEraser', {
  getModelStatus: () => ipcRenderer.invoke('get-model-status'),
  chooseModelFolder: () => ipcRenderer.invoke('choose-model-folder'),
  downloadModel: (url) => ipcRenderer.invoke('download-model', url),
  launchEditor: () => ipcRenderer.invoke('launch-editor')
});