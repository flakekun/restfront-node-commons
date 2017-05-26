(function () {
    'use strict';

    const Promise = require('bluebird');
    const GenericPool = require('generic-pool');
    const FBDriver = require('node-firebird');
    const Connection = require('./connection');
    const utils = require('./utils');

    module.exports = {
        createPool,
        createConnection,

        parseUrl: utils.parseUrl,
        escape: FBDriver.escape
    };

    /**
     * Создать пул соединений к БД
     *
     * @param {String} url            Строка подключения к БД
     * @param {String} user           Пользователь
     * @param {String} password       Пароль
     * @param {Number} options        Настройки пула, аналогичны настройкам generic-pool
     * @returns {Pool}
     */
    function createPool(url, user, password, options) {
        options = options || {};

        const factory = {
            create() {
                const connection = createConnection(url, user, password);
                return connection.open();
            },
            destroy(connection) {
                return connection.close();
            },
            validate(connection) {
                return connection.queryRead('SELECT 1 AS value FROM rdb$database')
                    .then((rows) => Boolean(rows && rows.length === 1 && rows[0].value === 1))
                    .catch(() => false);
            }
        };

        const opts = Object.assign({}, {
            Promise,
            max: 3,
            min: 0,
            testOnBorrow: true,
            acquireTimeoutMillis: 1 * 60 * 1000,
            evictionRunIntervalMillis: 0.5 * 60 * 1000,
            idleTimeoutMillis: 5 * 60 * 1000
        }, options);

        return GenericPool.createPool(factory, opts);
    }

    /**
     * Создать подключение к БД
     *
     * @param url       Путь к БД
     * @param user      Пользователь
     * @param password  Пароль
     * @returns {Connection}
     */
    function createConnection(url, user, password) {
        return new Connection(url, user, password);
    }
})();