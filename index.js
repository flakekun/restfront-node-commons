(function() {
    'use strict';

    var FB = require('./app/firebird/firebird');
    var Log = require('./app/log');
    var Auth = require('./app/auth');
    var HttpUtils = require('./app/utils/httpUtils');
    var MomentUtils = require('./app/utils/momentUtils');
    var DataUtils = require('./app/utils/dataUtils');

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
        momentUtils: MomentUtils,

        /** @member {DataUtils} */
        dataUtils: DataUtils,

        err: require('./app/utils/err')
    };
})();