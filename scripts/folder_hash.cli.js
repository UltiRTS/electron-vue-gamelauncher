const {hashElement} = require('folder-hash');

const folders4engine = ['AI', 'base', 'include', 'lib', 'share', 'LuaUI'];
const folders4mod = ['gamedata', 'LuaGaia', 'LuaIntro', 'LuaRules', 'LuaUI', 'lups', 'scripts', 'modularCommAPI', 'units', 'features'];

const hashFolder = async (targetFolder, mode) => {
    if(mode == 'engine') {
        return hashElement(targetFolder, {folders: {include: folders4engine}, files: {include: ['*']}}).then((hash) => {
            return hash.hash;
        }).catch((e) => {
            console.log(e);
        })
    } else if(mode == 'mod') {
        return hashElement(targetFolder, {folders: {include: folders4mod}, files: {include: ['*']}}).then((hash) => {
            return hash.hash;
        }).catch((e) => {
            console.log(e);
        })
    }
}

const main = async () => {
    const args = process.argv.slice(2);
    if(args.length < 2) {
        console.log('insufficient parameters');
        return;
    }

    const targetFolder = args[0];
    const mode = args[1];

    const res = await hashFolder(targetFolder, mode);
    console.log(res);
}

main();