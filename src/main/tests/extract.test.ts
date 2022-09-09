import {extractNgetFolderHash} from '../utils/fs_relate';

const main = async () => {
    const zip_path = '/home/chan/Downloads/Installer.zip'    
    const extract_to = '/tmp/installer';

    const res = await extractNgetFolderHash(zip_path, extract_to, 'mod');
    console.log(res);
}

main();