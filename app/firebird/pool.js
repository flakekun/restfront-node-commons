(function () {
    'use strict';

    var Promise = require('bluebird');
    var FBDriver = require('node-firebird');
    var Connection = require('./connection');
    var utils = require('./utils');

    module.exports = Pool;

    /**
     * Пул соединений
     *
     * @param {Number} maxConnections Максимальное кол-во соединений у пуле
     * @param {String} url            Строка подключения к БД
     * @param {String} user           Пользователь
     * @param {String} password       Пароль
     * @constructor
     */
    function Pool(maxConnections, url, user, password) {
        this.options = utils.parseUrl(url);
        this.options.url = url;
        this.options.user = user;
        this.options.password = password;

        this.pool = FBDriver.pool(maxConnections, this.options);
        this._get = Promise.promisify(this.pool.get, {context: this.pool});
    }

    Pool.prototype.getConnection = function () {
        var self = this;

        return this._get()
            .then(function (db) {
                var connection = new Connection(self.options.url, self.options.user, self.options.password);
                connection.database = db;
                return connection;
            });
    };

    Pool.prototype.close = function () {
        this.pool.destroy();
    };
})();