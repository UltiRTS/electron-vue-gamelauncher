import {getSystemInfo} from '../utils/dntp';
import os from 'os';
import { getEngine, getMod } from '../utils/util';
import path from 'path';


const main = async () => {
    const platform = os.platform();
    let infoType: string = '';
    if(platform === 'win32') infoType = 'windows';
    if(platform==='linux') infoType = 'linux';

    const resp = await getSystemInfo(infoType);
    if(!(resp.status === 200)) {
        console.log('internet failure');
        return;
    }

    if(!(resp.data.success)) {
        console.log('failed to retrieve');
        return;
    }

    const system_config = resp.data.systemconf;
    const engine = resp.data.engine;
    const prefix = resp.data.prefix;

    let retry = 3;
    while(retry > 0) {
        const installRes = await getEngine({
            url: prefix + '/' + engine.zip_name,
            extract_to: path.join('/tmp', engine.extract_to),
            folder_hash: system_config.engine_essentials_hash,
            archive: engine.zip_name
        }, (offset: number) => {})
        if(installRes.status) {
            console.log('engine installation successs');
            break;
        }
        console.log(installRes);
        retry--;
    }

}

main();