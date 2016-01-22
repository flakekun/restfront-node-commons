(function() {
    'use strict';

    var FB = require('./app/firebird/firebird');
    var Log = require('./app/log');
    var Auth = require('./app/auth');
    var Err = require('./app/utils/err');
    var HttpUtils = require('./app/utils/httpUtils');
    var MomentUtils = require('./app/utils/momentUtils');
    var DataUtils = require('./app/utils/dataUtils');
    var Migrate = require('./app/migrate');

    module.exports = new Index();

    function Index() { }

    Index.prototype.fb = FB;
    Index.prototype.log = Log;
    Index.prototype.auth = Auth;
    Index.prototype.err = Err;
    Index.prototype.migrate = Migrate;
    Index.prototype.httpUtils = HttpUtils;
    Index.prototype.momentUtils = MomentUtils;
    Index.prototype.dataUtils = DataUtils;
})();