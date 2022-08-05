import axios from "axios"
import MultipartDownload from 'multipart-download';

const request = axios.create({
  baseURL: 'http://144.126.145.172:3000',
  timeout: 1000,
});

export const getArchives = () => {
    return request.get('/archives');
}

// {
//   "prefix": "http://144.126.145.172",
//   "success": true,
//   "systemconf": {
//     "id": 1,
//     "config_name": "beta",
//     "engine_archive_id": 4,
//     "mod_archive_id": 5,
//     "engine_essentials_hash": "+pP4YCSjAi9zM5B4s+qYJIyB3G8=",
//     "mod_essentials_hash": "sraSwfi2PUs1czZEZvCOV5pRB5g="
//   },
//   "engine": {
//     "id": 4,
//     "zip_name": "bar_engine.zip",
//     "extract_to": "engine",
//     "zip_hash": "5f2ed71eaec1da6f8ead4cd348c10e8c"
//   },
//   "mod": {
//     "id": 5,
//     "zip_name": "zkmod.zip",
//     "extract_to": "games",
//     "zip_hash": "443e1f38b3d0d21e9e73b931af057fb0"
//   }
// }

export const getSystemInfo = () => {
  return request.get('/systemconf'); 
}

export const getLobbyInfo = () => {
  return request.get('/lobby');
}


export const downloadFile = (target: string, storeDir: string, filename: string) => {
  return new MultipartDownload()
    .start(target, {
      numOfConnections: 5,
      saveDirectory: storeDir,
      fileName: filename,
    });
}