import { contextBridge, ipcRenderer } from 'electron';
import { SaveDetectionPayload, ReplayItem } from './types';

contextBridge.exposeInMainWorld('electronAPI', {
  getProcessStatus: () => ipcRenderer.invoke('get-process-status'),
  onProcessStatusChange: (callback: (running: boolean) => void) => {
    const handler = (_event: any, running: boolean) => callback(running);
    ipcRenderer.on('process-status-changed', handler);
    return () => {
      ipcRenderer.removeListener('process-status-changed', handler);
    };
  },
  onSaveDetected: (callback: (payload: SaveDetectionPayload) => void) => {
    const handler = (_event: any, payload: SaveDetectionPayload) => callback(payload);
    ipcRenderer.on('save-detected', handler);
    return () => {
      ipcRenderer.removeListener('save-detected', handler);
    };
  },
  getSavesList: (customPath?: string) => ipcRenderer.invoke('get-saves-list', customPath),
  getReplaysList: (customPath?: string) => ipcRenderer.invoke('get-replays-list', customPath),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  createDesktopShortcut: () => ipcRenderer.invoke('create-desktop-shortcut'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
});
