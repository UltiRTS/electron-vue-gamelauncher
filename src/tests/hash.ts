import {hashFolder} from '../main/utils/hash';

const main = async () => {
    try {
        const res = await hashFolder('/home/chan/games/engine', 'engine')
        console.log(res.hash);
    } catch(e) {
        console.log(e);
    }
}

main();