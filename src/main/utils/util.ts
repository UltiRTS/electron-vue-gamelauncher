import fs from 'fs'
import path from 'path';
import { download } from './download';
import { extractNgetFolderHash } from './fs_relate';
import crypto from 'crypto';

export async function getEngine(engineInfo: {
    url: string
    extract_to: string
    folder_hash: string
    archive: string
}, report: (offset: number) => void) {
    console.log('engine info: ', engineInfo);
    if(fs.existsSync(engineInfo.extract_to)) {
        fs.rmSync(engineInfo.extract_to, {
            recursive: true,
        })
    }

    fs.mkdirSync(engineInfo.extract_to, {
        recursive: true
    });
    
    const downloadRes = await download(engineInfo.url, engineInfo.extract_to, engineInfo.archive, report);
    if(!downloadRes.status) {
        return {
            status: false,
            msg: `failed to download engien`
        }
    }

    const zipPath = path.join(engineInfo.extract_to, engineInfo.archive);
    const extractRes = await extractNgetFolderHash(zipPath, engineInfo.extract_to, 'engine');

    if(!(extractRes.status)) {
        return {
            status: false,
            msg: `failed to extract ${engineInfo.archive}`
        }
    }

    console.log(engineInfo);
    console.log(extractRes);

    if(extractRes.folderHash != engineInfo.folder_hash) {
        return {
            status: false,
            msg: `wrong folder hash engine`
        }
    }

    fs.unlinkSync(zipPath);

    return {
        status: true,
        msg: 'success'
    }

}

export async function getLobby(lobbyInfo: {
    url: string,
    install_loc: string,
    hash: string,
    name: string
}, report: (offset: number) => void) {
    if(!fs.existsSync(lobbyInfo.install_loc))  {
        fs.mkdirSync(lobbyInfo.install_loc);
    }

    const downloadRes = await download(lobbyInfo.url, lobbyInfo.install_loc, lobbyInfo.name, report);

    if(!downloadRes.status) {
        return {
            status: false,
            msg: `failed to download ${lobbyInfo.name}`
        }
    }

    const lobbyPath = path.join(lobbyInfo.install_loc, lobbyInfo.name);
    fs.chmodSync(lobbyPath, 0o755);

    return {
        status: true,
        msg: 'lobby installed'
    }
}

export async function getMod(modInfo: {
    url: string
    extract_to: string
    name: string
    archive: string
    folder_hash: string
}, report: (offset: number) => void) {
    if(fs.existsSync(modInfo.extract_to)) {
        fs.rmSync(modInfo.extract_to, {
            recursive: true,
        })
    }

    fs.mkdirSync(modInfo.extract_to, {
        recursive: true
    });

    console.log(modInfo.url);
    let downloadRes;
    try {
        downloadRes = await download(modInfo.url, modInfo.extract_to, modInfo.archive, report);
    } catch(e) {
        console.log(e);
        return {
            status: false,
            msg: `failed to download ${modInfo.name}`
        }
    }

    if(!downloadRes.status) {
        return {
            status: false,
            msg: `failed to download ${modInfo.name}`
        }
    }

    const zip_path = path.join(modInfo.extract_to, modInfo.archive);

    console.log('installiong to: ', zip_path);

    const extractRes = await extractNgetFolderHash(zip_path, modInfo.extract_to, 'mod');
    if(!extractRes.status) {
        return {
            status: false,
            msg: `failed to extract ${modInfo.archive}`
        }
    }

    fs.unlinkSync(zip_path);

    if(!(extractRes.folderHash !== modInfo.folder_hash)) {
        return {
            status: false,
            msg: `wrong folder hash found`
        }
    }

    return {
        status: true,
        msg: 'success',
    }
}