import {app, BrowserWindow, ipcMain, dialog} from 'electron';
import {join} from 'path';
import { store } from './store/store';
import {getSystemInfo, downloadFile, getLobbyInfo, getModsInfo, getArchiveById} from './utils/dntp';
import { hashArchive, hashFolder } from './utils/hash';
import fs from 'fs';
import path from 'path';
import {exec, spawn ,execSync, execFile} from 'child_process';
import os from 'os';
import {download} from './utils/download';
import {extractNgetFolderHash} from './utils/fs_relate';
import log from 'electron-log';
import { getEngine, getLobby, getMod } from './utils/util';
import { rmSync } from 'original-fs';
// import { store } from './store/store';

const APP_DATA = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
console.log(APP_DATA);
log.transports.file.resolvePath = () => path.join(APP_DATA, 'UltiRTS/launcher.log');
console.log = log.log;


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
      const sender = event.sender;
      sender.send('start', '');
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

ipcMain.handle('installed', async (event) => {
  console.log(store.get('install_location'))
  return store.get('install_location') !== '';
})

ipcMain.handle('update-lobby', async (event) => {
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

  const sender = event.sender;

  if(local_version === remote_version && fs.existsSync(`${store.get('install_location')}/${lobbyFileName}`)) {
    return {
      status: true
    }
  } else {
    console.log(queryRes.data);
    const res = await getLobby({
      url: prefix + '/' + lobbyFileName,
      install_loc: store.get('install_location') as string,
      hash: lobbyInfo.lobby_hash,
      name: lobbyFileName
    }, (offset: number) => {
      sender.send('download:progress', lobbyFileName, offset);
    })
    if(res.status) {
      store.set('lobby_version', lobbyInfo.version);
      return {
        status: true
      }
    } else {
      return {
        status: false,
        msg: res.msg
      }
    }
  }

})

ipcMain.handle('update-mods', async (event) => {
  const mods: {
    [modname: string]: number
  } = {}

  const modsInfo = await getModsInfo();

  const mods_path = store.get('install_location') as string + '/springwritable/games';
  if(!fs.existsSync(mods_path)) {
    fs.mkdirSync(mods_path, {
      recursive: true
    })
  }

  const localMods = fs.readdirSync(store.get('install_location') as string + '/springwritable/games');
  const remoteMods: string[] = [];
  const missingMods: string[] = [];
  const folderHashes: {[name:string]: string} = {};
  console.log(modsInfo);

  if(modsInfo.status !== 200 || !modsInfo.data.success) {
    return {
      status: false,
      msg: 'network error'
    }
  }
  
  console.log(store.get('install_location') as string);
  console.log(modsInfo.data);
  for(const mod of modsInfo.data.mods) {
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

    if(localMods.includes(mod) && folderHashes[mod] === local_folder_hash) {
      // has mod
    } else {
      missingMods.push(mod);
    }
  }
  console.log('mods to update: ', missingMods);

  if(missingMods.length === 0) return {
    status: true
  };

  const sender = event.sender;

  for(const mod of missingMods) {
    const archiveResp = await getArchiveById(mods[mod]);
    const archive = archiveResp.data.archive;
    const prefix = archiveResp.data.prefix;

    const modInfo = {
        url: prefix + '/' + archive.zip_name,
        extract_to: path.join(store.get('install_location') as string, archive.extract_to),
        folder_hash: folderHashes[mod],
        archive: archive.zip_name,
        name: mod
    }

    const res = await getMod(modInfo, (offset: number) => {
      sender.send('download:progress', mod, offset);
    })

    if(res.status) {
        console.log(`mod ${mod} installed`);
    }
  }

  return {
    status: true
  }
})

ipcMain.handle('update-engine', async (event) => {
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

  const sender = event.sender;

  const engineFolder = path.join(store.get('install_location') as string, engine.extract_to);

  let engineLocalFolderHash = '';
  try {
    engineLocalFolderHash = await hashFolder(engineFolder, 'engine');
  } catch(e) {
    engineLocalFolderHash = '';
  }

  console.log('engine local hash:', engineLocalFolderHash)
  if(engineFolderHash === engineLocalFolderHash) {
    return {
      status: true
    }
  } else {
    const system_config = queryRes.data.systemconf;
    const engine = queryRes.data.engine;
    const prefix = queryRes.data.prefix;
    const installRes = await getEngine({
        url: prefix + '/' + engine.zip_name,
        extract_to: path.join(store.get('install_location') as string, engine.extract_to),
        folder_hash: system_config.engine_essentials_hash,
        archive: engine.zip_name
    }, (offset: number) => {
      sender.send('download:progress', engine.zip_name, offset);
    })
    if(installRes.status) {
        console.log('engine installation successs');
        return {
          status: true
        }
    } else {
      return {
        status: false,
        msg: installRes.msg
      }
    }
  }
})

const launch = () => {
  const platform = os.platform(); 
  const install_location = store.get('install_location') as string;
  const springwritableDir = path.join(install_location, 'springwritable');
  if(os.platform()==='linux') {
    const lobbyPath = path.join(store.get('install_location') as string, 'lobby.AppImage')
    console.log('launch command:',`lobbydir='${store.get('install_location')}' ${lobbyPath}`);
    exec(`lobbydir='${store.get('install_location')}' '${lobbyPath}'`, (err, stdout, stderr) => {
      if(err) {
        console.log(err);
      }
      console.log(stdout);
      console.log(stderr);
    })
  } else if(os.platform() === 'win32') {
    console.log('launching in windows');
    const lobbyPath = path.join(store.get('install_location') as string, 'lobby.exe');
    // try {
    //   execSync(`$env:lobbydir="${store.get('install_location')}"`);
    // } catch(e) {
    //   console.log('set env var errored', e);
    // }
    exec(`"${lobbyPath}"`, {env: {
      ...process.env,
      lobbydir: store.get('install_location') as string
    }}, (err, stdout, stderr) => {
      if(err) {
        console.log(err);
      }
      console.log(stdout);
      console.log(stderr);
    })
  }
}

ipcMain.handle('clear-cache', (event, []) => {
  store.clear(); 
  app.quit();
})

function heat_engine() {
  console.log('heating engine');
  const platform = os.platform(); 
  const install_location = store.get('install_location') as string;
  const replay_demo = path.join(install_location, 'engine/demos/replay.sdfz');
  const springwritableDir = path.join(install_location, 'springwritable');
  
  if(platform === 'win32') {
    const files2chmod = ['spring.exe', 'spring-dedicated.exe', 'spring-headless.exe'];
    for(const filename of files2chmod) {
      const absPath = path.join(install_location, 'engine/' + filename);
      fs.chmodSync(absPath, 0o755); 
    }
    const headlessPath = path.join(install_location, 'engine/spring-headless.exe');
    exec(`"${headlessPath}" -write-dir="${springwritableDir}" "${replay_demo}"`, (error, stdout, stderr) => { if(error) console.log(error);
      console.log('stdout: ', stdout);
      console.log('stderr: ', stderr);
    }).on('exit', () => {
      launch();
    })
  } else if(platform === 'linux') {
    const files2chmod = ['spring', 'spring-dedicated', 'spring-headless'];
    for(const filename of files2chmod) {
      const absPath = path.join(install_location, 'engine/' + filename);
      fs.chmodSync(absPath, 0o755); 
    }
    const headlessPath = path.join(install_location, 'engine/spring-headless')
    exec(`"${headlessPath}" -write-dir='${springwritableDir}' '${replay_demo}'`, (error, stdout, stderr) => { if(error) console.log(error);
      console.log('stdout: ', stdout);
      console.log('stderr: ', stderr);
    }).on('exit', () => {
      launch(); 
    })
  }
}

// ipcMain.handle('heat-engine', (event) => {
// })


ipcMain.handle('launch', (event) => {
  if(store.get('installed') as boolean === false) {
    heat_engine();    
  } else {
    launch()  
  }
  store.set('installed', true);
})