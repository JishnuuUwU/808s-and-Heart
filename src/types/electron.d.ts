export interface ElectronAPI {
  isElectron: boolean;
  getAlwaysOnTop: () => Promise<boolean>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  minimize: () => void;
  close: () => void;
  toggleMaximize: () => void;
  getDesktopSources: () => Promise<Array<{ id: string; name: string }>>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      window: Window | null;
      onenter?: (event: Event) => void;
    };
  }
}
