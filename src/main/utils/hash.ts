import { hashElement } from 'folder-hash';
import crypto from 'crypto';
import fs from 'fs';

const folders4engine = ['AI', 'base', 'include', 'lib', 'share', 'LuaUI'];
const folders4mod = ['gamedata', 'LuaGaia', 'LuaIntro', 'LuaRules', 'LuaUI', 'lups', 'scripts', 'modularCommAPI', 'units', 'features'];


export const hashFolder = async (targetFolder: string, mode: string) => {
    if(mode == 'engine') {
        return hashElement(targetFolder, {folders: {include: folders4engine}, files: {include: ['*']}}).then((hash: any) => {
            return hash.hash;
        }).catch((e: any) => {
            console.log(e);
        })
    } else if(mode == 'mod') {
        return hashElement(targetFolder, {folders: {include: folders4mod}, files: {include: ['*']}}).then((hash: any) => {
            return hash.hash;
        }).catch((e: any) => {
            console.log(e);
        })
    }
}

export const hashArchive = (archive: string) => {
    const buffer = fs.readFileSync(archive);
    return crypto.createHash('md5').update(buffer).digest('hex');
}