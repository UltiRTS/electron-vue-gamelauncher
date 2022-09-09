import * as path from 'path';
import MultipartDownload from 'multipart-download';

export function download(url: string, 
    dir: string, 
    filename: string, 
    report: (offset) => void): Promise<{status: boolean}> {

  return new Promise((resolve, reject) => {
    new MultipartDownload()
        .start(url, {
            numOfConnections: 5,
            saveDirectory: dir,
            fileName: filename
        }).on('error', (err) => {
            reject({
                status: false,
            });
        }).on('end', () => {
            resolve({
                status: true
            });
        }).on('data', (data, offset) => {
            report(offset);
        })
  }) 
}