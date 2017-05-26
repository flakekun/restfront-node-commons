(function() {
    'use strict';

    module.exports = {
        fb: require('./app/firebird/firebird'),
        log: require('./app/log'),
        auth: require('./app/auth'),
        err: require('./app/utils/err'),
        migrate: require('./app/migrate'),
        httpUtils: require('./app/utils/httpUtils'),
        momentUtils: require('./app/utils/momentUtils'),
        dataUtils: require('./app/utils/dataUtils'),
        sqlUtils: require('./app/utils/sqlUtils')
    };
})();