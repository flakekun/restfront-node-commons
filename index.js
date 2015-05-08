(function() {
    'use strict';

    module.exports = {
        /** @member {FB} */
        get fb() {
            return require('./app/fb');
        },

        get log() {
            return require('./app/log');
        },

        get auth() {
            return require('./app/auth');
        }
    };
})();