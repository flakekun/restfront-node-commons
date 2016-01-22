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

    /**
     * Firebird
     *
     * @type {FB}
     */
    Index.prototype.fb = FB;

    /**
     * Логирование
     *
     * @type {Log}
     */
    Index.prototype.log = Log;

    /**
     * Аутентификация
     *
     * @type {Auth}
     */
    Index.prototype.auth = Auth;

    /**
     * Исключения
     *
     * @type {Err}
     */
    Index.prototype.err = Err;

    /**
     * Миграции
     *
     * @type {Migrate}
     */
    Index.prototype.migrate = Migrate;

    /**
     * Хелперы для работы с http
     *
     * @type {HttpUtils}
     */
    Index.prototype.httpUtils = HttpUtils;

    /**
     * Хелперы для работы с датами
     *
     * @type {MomentUtils}
     */
    Index.prototype.momentUtils = MomentUtils;

    /**
     * Хелперы для работы с данными из БД
     *
     * @type {DataUtils}
     */
    Index.prototype.dataUtils = DataUtils;
})();