(function() {
    'use strict';

    var Q = require('q');
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
    }

    Pool.prototype.getConnection = function() {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            self.pool.get(function(err, db) {
                if (err) {
                    reject(err);
                    return;
                }

                var connection = new Connection(self.options.url, self.options.user, self.options.password);
                connection.database = db;
                resolve(connection);
            });
        });
    };

    Pool.prototype.close = function() {
        this.pool.destroy();
    };
})();