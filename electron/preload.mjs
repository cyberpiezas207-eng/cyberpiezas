import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
  isDesktop: true,
  platform: process.platform,
  getOnlineStatus: () => navigator.onLine,
  onOnlineStatusChange: (callback) => {
    const emitStatus = () => callback(navigator.onLine);
    window.addEventListener('online', emitStatus);
    window.addEventListener('offline', emitStatus);

    return () => {
      window.removeEventListener('online', emitStatus);
      window.removeEventListener('offline', emitStatus);
    };
  },
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
};

contextBridge.exposeInMainWorld('boutiqueDesktop', desktopApi);
