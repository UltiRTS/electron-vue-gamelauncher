import { hashArchive, hashFolder } from './hash';
import unzipper from 'unzipper';
import fs from 'fs';

export const extractNgetFolderHash = (zip_path: string, extract_to: string, mode: string): Promise<{
    status: boolean
    folderHash: string
}> => {
    if(!fs.existsSync(extract_to)) {
        fs.mkdirSync(extract_to, {recursive: true})
    }

    return new Promise((resolve, reject) => {
        try {
            fs.createReadStream(zip_path)
                .pipe(unzipper.Extract({path: extract_to}))
                .on('close', async () => {
                    const folderHash = await hashFolder(extract_to, mode);
                    resolve({
                        status: true,
                        folderHash
                    });
                })
        } catch(e) {
            reject({
                status: false,
                folderHash: ''
            });
        }
    })

}
