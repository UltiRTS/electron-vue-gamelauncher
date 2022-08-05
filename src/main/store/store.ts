import Store from 'electron-store';

export const store = new Store({
    schema: {
        installed: {
            type: 'boolean',
            default: false
        },
        install_location: {
            type: 'string',
            default: ''
        },
        lobby_version: {
            type: 'string',
            default: ''
        }
    }
});
