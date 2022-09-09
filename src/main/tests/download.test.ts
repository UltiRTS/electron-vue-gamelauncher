import {download} from '../utils/download'

const main = async () => {
    const url = 'http://144.126.145.172/test.zip';
    const filename = 'test.zip';
    const dir = '/tmp';
    const res = await download(url, dir, filename, (offset: any) => {
        console.log(offset);
    })

    if(res.status === true) {
        console.log('downloaded')
    } else {
        console.log('failed in downloading');
    }
}

main();