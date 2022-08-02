/*
   Add all your exposed Electron API's here.
   The purpose of this is to get static analysis in Vue files without additional plug-ins.
 */
import { IpcRenderer } from 'electron'

// const ipcRenderer = window.electron.ipcRenderer as IpcRenderer
const send = window.electron.send
const receive = window.electron.receive
const invoke = window.electron.invoke

export {
  // ipcRenderer,
  send,
  receive,
  invoke
}
