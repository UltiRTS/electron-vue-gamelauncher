import {getArchiveById, getModsInfo} from '../utils/dntp';
import { getMod } from '../utils/util';
import path from 'path';


const main = async () => {
    const resp = await getModsInfo();
    if(resp.status === 200) {
        const modsInfo = resp.data;

        for(const mod of modsInfo.mods) {
            let retry = 3;
            while(retry > 0) {
                const archiveResp = await getArchiveById(mod.archive);
                const archive = archiveResp.data.archive;
                const prefix = archiveResp.data.prefix;

                const modInfo = {
                    url: prefix + '/' + archive.zip_name,
                    extract_to: path.join('/tmp', archive.extract_to),
                    folder_hash: mod.folder_hash,
                    archive: archive.zip_name,
                    name: mod.name
                }

                const res = await getMod(modInfo, (offset: number) => {})
                if(res.status) {
                    console.log('mods installed');
                    break;
                }

                retry--;
            }
        }
    }
}

main();