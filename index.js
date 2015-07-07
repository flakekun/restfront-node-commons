(function() {
    'use strict';

    var FB = require('./app/fb');
    var Log = require('./app/log');
    var Auth = require('./app/auth');
    var HttpUtils = require('./app/httpUtils');
    var MomentUtils = require('./app/momentUtils');

    module.exports = {
        /** @member {FB} */
        fb: FB,

        /** @member {Log} */
        log: Log,

        /** @member {Auth} */
        auth: Auth,

        /** @member {HttpUtils} */
        httpUtils: HttpUtils,

        /** @member {MomentUtils} */
        momentUtils: MomentUtils
    };
})();