(function () {
    'use strict';

    var Promise = require('bluebird');
    var PreparedStatement = require('./statement');
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
     * @param {String} sql     Текст запроса
     * @param {Array}  params  Массив параметров запроса
     * @returns {Promise<data>}
     */
    Transaction.prototype.query = function (sql, params) {
        var self = this;
        utils.updateLastActive(self.connection);

        return new Promise(function (resolve, reject) {
            self.transaction.query(sql, params, function (err, result, output, isArray) {
                if (err) {
                    return reject(err);
                }

                resolve(result);
            });
        });
    };

    /**
     * Коммит транзакции
     *
     * @returns {Promise}
     */
    Transaction.prototype.commit = function () {
        utils.updateLastActive(this.connection);

        return Promise.promisify(this.transaction.commit.bind(this.transaction))();
    };

    /**
     * Откат транзакции
     *
     * @returns {Promise}
     */
    Transaction.prototype.rollback = function () {
        utils.updateLastActive(this.connection);

        return Promise.promisify(this.transaction.rollback.bind(this.transaction))();
    };

    /**
     * Создание prepared statement
     *
     * @param sql Текст запроса
     * @returns {Promise<PreparedStatement>}
     */
    Transaction.prototype.prepareStatement = function (sql) {
        var self = this;
        utils.updateLastActive(self.connection);

        return Promise.promisify(self.transaction.newStatement.bind(self.transaction))(sql)
            .then(function (statement) {
                return new PreparedStatement(self.connection, self, statement);
            });
    };
})();
