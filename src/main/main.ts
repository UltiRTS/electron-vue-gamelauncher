import {app, BrowserWindow, ipcMain, dialog} from 'electron';
import {join} from 'path';
import { store } from './store/store';
import {getSystemInfo, downloadFile} from './utils/dntp';
import { hashArchive, hashFolder } from './utils/hash';
import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
// import { store } from './store/store';

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      devTools: true,
    }
  });

  ipcMain.handle('dialog:openDirectory', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return
    } else {
      console.log(filePaths[0]);
      store.set('install_location', filePaths[0]);
      // pass event down
      ipcMain.emit('check-update', event);
      return filePaths[0]
    }
  })

  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.argv[2];
    mainWindow.loadURL(`http://localhost:${rendererPort}`);
    mainWindow.webContents.openDevTools()
    mainWindow.webContents.send('start', 'started');
  }
  else {
    mainWindow.loadFile(join(app.getAppPath(), 'renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();

    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});

ipcMain.on('start', (event) => {
  const installed = store.get('installed');
  event.reply('installed', installed);
})

ipcMain.on('message', (_event, message) => {
  console.log(message);
})

const download = (info: {
  url: string,
  filename: string,
  extract_to: string,
  zip_hash: string,
}) => {
  console.log(info);
  return downloadFile(info.url, info.extract_to, info.filename);
}

ipcMain.on('extract', async (_event, _info: {
  targetFolder: string,
  filename: string,
  extract_to: string,
  mode: string,
  folder_hash: string
}) =>  {
  const sender = _event.sender;

  const absPath = path.join(_info.targetFolder, _info.extract_to);
  fs.mkdirSync(absPath, { recursive: true });

  fs.createReadStream(`${_info.targetFolder}/${_info.filename}`)
    .pipe(unzipper.Extract({ path: absPath }))
    .on('close', async () => {
      const hash = await hashFolder(absPath, _info.mode);
      console.log(hash);

      sender.send('extract:done', _info.filename, hash === _info.folder_hash);
    })
  
})

ipcMain.on('check-update', async (_event) => {
  const queryRes = await getSystemInfo();
  const data = queryRes.data;
  const engineFolderHash = data.systemconf.engine_essentials_hash;
  const modFolderHash = data.systemconf.mod_essentials_hash;
  const engine = data.engine;
  const mod = data.mod;

  const sender = _event.sender;

  // TODO: hash check here

  download({
    url: `${data.prefix}/${engine.zip_name}`,
    filename: engine.zip_name,
    zip_hash: engine.zip_hash,
    extract_to: store.get('install_location') as string
  }).on('data', (data, offset) => {
    sender.send('download:progress', engine.zip_name, offset);
  }).on('end', () => {
    const hash = hashArchive(`${store.get('install_location')}/${engine.zip_name}`);
    if(hash === engine.zip_hash) {
      sender.send('download:complete', engine.zip_name);
      ipcMain.emit('extract', _event, {
        targetFolder: store.get('install_location') as string,
        filename: engine.zip_name, 
        extract_to: engine.extract_to,
        mode: 'engine',
        folder_hash: engineFolderHash
      })
    } else {
      sender.send('download:error', engine.zip_name);
    }
  }).on('error', () => {
    sender.send('download:error', engine.zip_name);
  })

  download({
    url: `${data.prefix}/${mod.zip_name}`,
    filename: mod.zip_name,
    zip_hash: mod.zip_hash,
    extract_to: store.get('install_location') as string
  }).on('data', (data, offset) => {
    sender.send('download:progress', mod.zip_name, offset);
  }).on('end', () => {
    const hash = hashArchive(`${store.get('install_location')}/${mod.zip_name}`);
    if(hash === mod.zip_hash) {
      sender.send('download:complete', mod.zip_name);
      ipcMain.emit('extract', _event, {
        targetFolder: store.get('install_location') as string,
        filename: mod.zip_name, 
        extract_to: mod.extract_to,
        mode: 'mod',
        folder_hash: modFolderHash
      })
    } else {
      sender.send('download:error', mod.zip_name);
    }
  }).on('error', () => {
    sender.send('download:error', mod.zip_name);
  })
});
