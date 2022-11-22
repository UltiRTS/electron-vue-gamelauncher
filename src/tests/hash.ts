import {hashFolder} from '../main/utils/hash';

const main = async () => {
    try {
        const res = await hashFolder('/home/chan/games/UltiRTS/engine', 'engine')
        console.log(res)
    } catch(e) {
        console.log(e);
    }
}

main();