/**
 * Should match main/preload.ts for typescript support in renderer
 */
export default interface ElectronApi {
  // ipcRenderer: Electron.IpcRenderer,
  send: (channel: string, args: any) => void,
  receive: (channel: string, listener: (...args: any[]) => void) => void,
  invoke: (channel: string, args: any) => Promise<any>
}

declare global {
  interface Window {
    electron: ElectronApi,
  }
}
