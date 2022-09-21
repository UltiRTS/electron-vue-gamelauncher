import {app, BrowserWindow, ipcMain, dialog} from 'electron';
import {join} from 'path';
import { store } from './store/store';
import {getSystemInfo, downloadFile, getLobbyInfo, getModsInfo, getArchiveById} from './utils/dntp';
import { hashArchive, hashFolder } from './utils/hash';
import fs from 'fs';
import path from 'path';
import {exec, execSync} from 'child_process';
import os from 'os';
import {download} from './utils/download';
import {extractNgetFolderHash} from './utils/fs_relate';
// import { store } from './store/store';

const baseUrl = 'http://144.126.145.172';

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



ipcMain.on('update-lobby', async (event) => {
  const platform = os.platform();
  let infoType: string = '';
  if(platform === 'win32') infoType = 'windows';
  if(platform==='linux') infoType = 'linux';

  const queryRes = await getLobbyInfo(infoType); 

  const lobbyInfo = queryRes.data.lobby;
  const lobbyFileName = lobbyInfo.lobby_name;
  const prefix = queryRes.data.prefix;

  const local_version = store.get('lobby_version');
  const remote_version = lobbyInfo.version;
  console.log(`lobby -\n local: ${local_version} remote: ${remote_version}`)
  console.log(`install path: ${store.get('install_location')}/${lobbyFileName}`)
  console.log(fs.existsSync(`${store.get('install_location')}/${lobbyFileName}`))
  console.log(local_version === remote_version)

  // if(local_version === remote_version && fs.existsSync(`${store.get('install_location')}/lobby.AppImage`)) {
  //   console.log('up to date')
  // }

  const sender = event.sender;

  if(local_version === remote_version && fs.existsSync(`${store.get('install_location')}/${lobbyFileName}`)) {
  // if(local_version === remote_version 
  //   && fs.existsSync(`${store.get('install_location')}/lobby.AppImage}`)) {
      console.log('lobby up to date')
    sender.send('update-lobby:done', 'done');
    ipcMain.emit('updated', event, {
      name: 'lobby'
    })
  } else {
    const storeDir = store.get('install_location') as string;
    const lobbyPath = path.join(storeDir, lobbyInfo.lobby_name);

    console.log(lobbyPath);

    const downloadRes = await download(prefix + '/' + lobbyInfo.lobby_name, storeDir, lobbyInfo.lobby_name, (offset) => {
      sender.send('download:progress', lobbyInfo.lobby_name, offset);
    });

    if(downloadRes.status) {
        sender.send('download:complete', 'done');
        fs.chmodSync(lobbyPath, 0o755); 
        store.set('lobby_version', remote_version);
        sender.send('update-lobby:done', 'done');
        ipcMain.emit('updated', event, {
          name: 'lobby'
        })
      console.log('lobby downloaded');
    } else {
      sender.send('download:error');
      console.log('lobby download error');
    }

  }
  
})

ipcMain.on('check-update', async (_event) => {
  const platform = os.platform();
  let infoType: string = '';
  if(platform === 'win32') infoType = 'windows';
  if(platform==='linux') infoType = 'linux';

  console.log('platform: ', platform);

  const queryRes = await getSystemInfo(infoType);
  const data = queryRes.data;
  console.log('data retrieved: ', data);
  const engineFolderHash = data.systemconf.engine_essentials_hash;
  const engine = data.engine;

  const sender = _event.sender;

  ipcMain.emit('update-lobby', _event);
  ipcMain.emit('update-mods', _event);

  const engineFolder = path.join(store.get('install_location') as string, engine.extract_to);

  const engineLocalFolderHash = await hashFolder(engineFolder, 'engine');

  console.log('engine local hash:', engineLocalFolderHash)
  if(engineFolderHash === engineLocalFolderHash) {
    ipcMain.emit('updated', _event, {
      name: 'engine'
    })
  } else {
    const res = await download(baseUrl + '/' + data.engine.zip_name as string,
      store.get('install_location') as string, 
      data.engine.zip_name, 
      (offset) => {
        sender.send('download:progress', data.engine.zip_name, offset);
    })
    if(res.status) {
      const zip_path = path.join(store.get('install_location') as string, data.engine.zip_name as string);
      const extract_to = path.join(store.get('install_location') as string, data.engine.extract_to as string);
      const res =  await extractNgetFolderHash(zip_path, extract_to, 'engine');
      console.log('remote engine folder hash:', engineFolderHash);
      console.log('engine extract res: ', res);
      if(res.status && res.folderHash === engineFolderHash) {;
        console.log('engine downloaded and extracted');

        ipcMain.emit('updated', _event, {
          name: 'engine'
        })
      }
    }
  }
});


const toUpdate: {
  engine: boolean
  lobby: boolean
  mods: {[key: string]: boolean},
} = {
  engine: false,
  // mod: false,
  lobby: false,
  mods: {},
}

const mods: {
  [modname: string]: number
} = {}

ipcMain.on('update-mods', async (_event) => {
  const modsInfo = await getModsInfo();
  if(!fs.existsSync(store.get('install_location') as string +'/springwritable/games')) {
    fs.mkdirSync(store.get('install_location') as string + '/springwritable/games', {recursive: true});
  }

  const localMods = fs.readdirSync(store.get('install_location') as string + '/springwritable/games');
  const remoteMods: string[] = [];
  const missingMods: string[] = [];
  const folderHashes: {[name:string]: string} = {};
  

  if(modsInfo.status === 200 && modsInfo.data.success) {
    console.log(modsInfo.data);
    for(const mod of modsInfo.data.mods) {
      toUpdate.mods[mod.name] = false; 
      mods[mod.name] = mod.archive;
      folderHashes[mod.name] = mod.folder_hash;
      remoteMods.push(mod.name);
    }

    for(const mod of remoteMods) {
      const archiveInfo = await getArchiveById(mods[mod]);
      const extract_to: string = path.join(store.get('install_location') as string, 
        archiveInfo.data.archive.extract_to);
      const local_folder_hash = await hashFolder(extract_to, 'mod');
      console.log(`folder hash of ${mod}`, local_folder_hash);
      toUpdate.mods[mod] = false;

      if(localMods.includes(mod) && folderHashes[mod] === local_folder_hash) {
        ipcMain.emit('updated', _event, {
          name: 'mods',
          mod_name: mod
        })
      } else {
        missingMods.push(mod);
      }
    }
    console.log(missingMods);

    if(missingMods.length === 0) return;

    const sender = _event.sender;

    for(const mod of missingMods) {
      const archiveId = mods[mod]; 
      const archiveInfo = await getArchiveById(archiveId);
      if(archiveInfo.status === 200) {
        if(archiveInfo.data.archive) {
          const zip_name: string = archiveInfo.data.archive.zip_name;
          const url = archiveInfo.data.prefix + '/' + zip_name;
          const extract_to: string = path.join(store.get('install_location') as string, 
            archiveInfo.data.archive.extract_to);
          const zip_path = path.join(store.get('install_location') as string, zip_name);

          const downloadRes = await download(url, store.get('install_location') as string, zip_name, (offset) => {
            sender.send('download:progress', zip_name, offset);
          })

          if(downloadRes.status) {
            const extractRes = await extractNgetFolderHash(zip_path, extract_to, 'mod');
            if(extractRes.status) {
              ipcMain.emit('updated', _event, {
                name: 'mods',
                mod_name: mod
              })
            }
          }
        }
      }
    }
  }
});

ipcMain.on('updated', (_event, _info: {
  name: string,
  mod_name? : string
}) => {
  if(_info.name === 'engine' || _info.name === 'lobby') toUpdate[_info.name] = true;
  else if(_info.name === 'mods') {
    if(_info.mod_name && _info.mod_name in mods) {
      toUpdate.mods[_info.mod_name] = true;
      console.log(_info.mod_name);
    }
  }
  console.log(_info);
  console.log(toUpdate);

  let launch = false;
  if(toUpdate.engine && toUpdate.lobby) {
    launch = true;
    for(const mod in toUpdate.mods) {
      launch = toUpdate.mods[mod] && launch;
    }
  }
  if(launch) {
    ipcMain.emit('launch', _event);
  }
})

ipcMain.on('mod-got', (_event, _info: {
  mod_name: string,
}) => {
  toUpdate.mods[_info.mod_name] = true;
})

ipcMain.on('launch', async (_event) => {
  store.set('installed', true);
  
  process.env.lobbydir = store.get('install_location') as string;
  console.log(process.env.lobbydir)

  const lobbyPath = path.join(store.get('install_location') as string, os.platform()==='linux'?'lobby.AppImage':'lobby.exe');
  if(os.platform()==='linux') {
    const lobbyPath = path.join(store.get('install_location') as string, 'lobby.AppImage')
    console.log('launch command:',`lobbydir='${store.get('install_location')}' ${lobbyPath}`);
    exec(`lobbydir='${store.get('install_location')}' ${lobbyPath}`, (err, stdout, stderr) => {
      if(err) {
        console.log(err);
      }
      console.log(stdout);
      console.log(stderr);
    })
  } else if(os.platform() === 'win32') {
    const lobbyPath = path.join(store.get('install_location') as string, 'lobby.exe')
    execSync(`set lobbydir ${store.get('install_location')}`);
    exec(`${lobbyPath}`, (err, stdout, stderr) => {
      if(err) {
        console.log(err);
      }
      console.log(stdout);
      console.log(stderr);
    })
  }
})
