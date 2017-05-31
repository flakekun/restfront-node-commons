(function () {
    'use strict';

    const Promise = require('bluebird');
    const PreparedStatement = require('./statement');
    const utils = require('./utils');

    /**
     * Обертка над Firebird транзакцией
     */
    class Transaction {
        /**
         * @param connection  Соединение
         * @param driverTransaction Firebird транзакция
         * @constructor
         */
        constructor(connection, driverTransaction) {
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
        query(sql, params) {
            return new Promise((resolve, reject) => {
                this.transaction.query(sql, params, (err, result, output, isArray) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(result);
                });
            });
        }

        /**
         * Коммит транзакции
         *
         * @returns {Promise}
         */
        commit() {
            return Promise.promisify(this.transaction.commit, {context: this.transaction})();
        }

        /**
         * Откат транзакции
         *
         * @returns {Promise}
         */
        rollback() {
            return Promise.promisify(this.transaction.rollback, {context: this.transaction})();
        }

        /**
         * Создание prepared statement
         *
         * @param sql Текст запроса
         * @returns {Promise<PreparedStatement>}
         */
        prepareStatement(sql) {
            return Promise.promisify(this.transaction.newStatement, {context: this.transaction})(sql)
                .then((statement) => {
                    return new PreparedStatement(this.connection, this, statement);
                });
        }
    }

    module.exports = Transaction;
})();
