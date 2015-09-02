(function () {
    'use strict';

    var Q = require('q');
    var utils = require('./utils');

    module.exports = Transaction;

    /**
     * Обертка над Firebird транзакцией
     *
     * @param connection  Соединение
     * @param driverTransaction Firebird транзакция
     * @constructor
     */
    function Transaction(connection, driverTransaction) {
        this.connection = connection;
        this.transaction = driverTransaction;
    }

    /**
     * Выполнить запрос на указанной транзакции
     *
     * @param sql         {String}       Текст запроса
     * @param params      {Array}        Массив параметров запроса
     * @promise {data}
     */
    Transaction.prototype.query = function (sql, params) {
        utils.updateLastActive(this.connection);

        return utils.query(this, sql, params);
    };

    /**
     * Коммит транзакции
     *
     * @promise {}
     */
    Transaction.prototype.commit = function () {
        var self = this;
        utils.updateLastActive(self.connection);

        return Q.Promise(function (resolve, reject) {
            self.transaction.commit(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };

    /**
     * Откат транзакции
     *
     * @promise {}
     */
    Transaction.prototype.rollback = function () {
        var self = this;
        utils.updateLastActive(self.connection);

        return Q.Promise(function (resolve, reject) {
            self.transaction.rollback(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };
})();
