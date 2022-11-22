import {getLobbyInfo} from '../utils/dntp';
import os from 'os';
import { getEngine, getLobby, getMod } from '../utils/util';
import path from 'path';
import { hashArchive } from '../utils/hash';


const main = async () => {
    const platform = os.platform();
    let infoType: string = '';
    if(platform === 'win32') infoType = 'windows';
    if(platform==='linux') infoType = 'linux';

    const resp = await getLobbyInfo(infoType);

    if(!(resp.status === 200)) {
        console.log('internet failure');
        return;
    }

    if(!(resp.data.success)) {
        console.log('failed to retrieve');
        return;
    }

    const prefix = resp.data.prefix;
    const lobby = resp.data.lobby;
    let retry = 3;
    while(retry > 0) {
        const lobbyInfo = {
            url: prefix + '/' + lobby.lobby_name,
            install_loc: '/tmp',
            hash: lobby.lobby_hash,
            name: lobby.lobby_name
        }

        const res = await getLobby(lobbyInfo, (offset: number) => {});
        console.log(res);
        if(res.status) {
            break;
        }

        retry--;
    }

}

main();