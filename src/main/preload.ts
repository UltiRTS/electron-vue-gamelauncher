import {contextBridge, ipcRenderer, IpcRendererEvent} from 'electron';

// White-listed channels.
const ipc = {
    'render': {
        // From render to main.
        'send': ['start'],
        // From main to render.
        'receive': ['installed', 'download:progress', 'download:complete', 'download:error', 'extract:done', 'update-lobby:done'],
        // From render to main and back again.
        'sendReceive': ['dialog:openDirectory']
    }
};

contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, args: any) => {
            let validChannels = ipc.render.send;
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, args);
            }
        },
        // From main to render.
        receive: (channel: string, listener) => {
            let validChannels = ipc.render.receive;
            if (validChannels.includes(channel)) {

                // // Show me the prototype (use DevTools in the render thread)
                // console.log(ipcRenderer);

                // Deliberately strip event as it includes `sender`.
                ipcRenderer.on(channel, (event, ...args) => {
                    listener(...args);
                });
            }
        },
        // From render to main and back again.
        invoke: (channel: string, args) => {
            let validChannels = ipc.render.sendReceive;
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, args);
            }
        }
})
