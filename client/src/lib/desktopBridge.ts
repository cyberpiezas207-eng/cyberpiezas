export type DesktopStatusCallback = (isOnline: boolean) => void;

declare global {
  interface Window {
    boutiqueDesktop?: {
      isDesktop: boolean;
      platform: string;
      getOnlineStatus: () => boolean;
      onOnlineStatusChange: (callback: DesktopStatusCallback) => (() => void) | void;
      openExternal: (url: string) => Promise<boolean>;
    };
  }
}

export function isDesktopEnvironment() {
  return Boolean(window.boutiqueDesktop?.isDesktop);
}

export function getDesktopPlatform() {
  return window.boutiqueDesktop?.platform ?? 'web';
}

export function getCurrentConnectivityStatus() {
  if (window.boutiqueDesktop?.getOnlineStatus) {
    return window.boutiqueDesktop.getOnlineStatus();
  }

  return navigator.onLine;
}

export function subscribeToConnectivityChanges(callback: DesktopStatusCallback) {
  if (window.boutiqueDesktop?.onOnlineStatusChange) {
    const cleanup = window.boutiqueDesktop.onOnlineStatusChange(callback);
    return typeof cleanup === 'function' ? cleanup : () => undefined;
  }

  const emitOnline = () => callback(true);
  const emitOffline = () => callback(false);

  window.addEventListener('online', emitOnline);
  window.addEventListener('offline', emitOffline);

  return () => {
    window.removeEventListener('online', emitOnline);
    window.removeEventListener('offline', emitOffline);
  };
}
