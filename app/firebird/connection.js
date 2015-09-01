(function() {
    'use strict';

    var Q = require('q');
    var FBDriver = require('node-firebird');
    var Transaction = require('./transaction');
    var PreparedStatement = require('./statement');
    var Metadata = require('./metadata');
    var Migration = require('./migration');
    var utils = require('./utils');

    module.exports = Connection;

    /**
     * Подключение к БД
     *
     * @param {String} url       Строка подключения к БД
     * @param {String} user      Пользователь
     * @param {String} password  Пароль
     * @constructor
     */
    function Connection(url, user, password) {
        this.database = null;
        /** @member {Transaction} */
        this.readTransaction = null;

        this.options = utils.parseUrl(url);
        this.options.user = user;
        this.options.password = password;

        /** @member {Metadata} */
        this.metadata = new Metadata(this);
        /** @member {Migration} */
        this.migration = new Migration(this);
    }

    /**
     * Открыть соединение с БД
     *
     * @promise {Connection}
     */
    Connection.prototype.open = function () {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            FBDriver.attach(self.options, function (err, db) {
                if (err) {
                    reject(err);
                    return;
                }

                self.database = db;
                resolve(self);
            });
        });
    };

    /**
     * Проверить активно ли соединение с БД
     *
     * @returns {boolean}
     */
    Connection.prototype.isConnected = function () {
        return this.database != null;
    };

    /**
     * Закрыть соединение с БД
     *
     * @promise {nothing}
     */
    Connection.prototype.close = function () {
        var self = this;

        return Q.Promise(function (resolve, reject) {
            if (!self.isConnected()) {
                return reject(new Error('Соединение с БД не установлено'));
            }

            // Если была открыта читающая транзакция, то сначала откатим ее
            var promise = self.readTransaction ? self.readTransaction.rollback() : Q.resolve();
            promise.then(function () {
                self.database.detach(function (err) {
                    if (err) {
                        return reject(err);
                    }

                    self.database = null;
                    resolve();
                });
            });
        });
    };

    /**
     * Получить читающую транзакцию
     * @promise {Transaction}
     */
    Connection.prototype.getReadTransaction = function () {
        var self = this;

        return Q.Promise(function (resolve, reject) {
            if (!self.isConnected()) {
                return reject(new Error('Соединение с БД не установлено'));
            }

            // Если читающая транзакция есть, то сразу отдадим ее
            if (self.readTransaction) {
                return resolve(self.readTransaction);
            }

            // Откроем читающую транзакцию и запомним ее в этом соединении
            self.database.transaction(FBDriver.ISOLATION_READ, function (err, fbTransaction) {
                if (err) {
                    reject(err);
                    return;
                }

                var wrapper = new Transaction(fbTransaction);
                self.readTransaction = wrapper;
                resolve(wrapper);
            });
        });
    };

    /**
     * Получить пишущую транзакцию
     *
     * @promise {Transaction}
     */
    Connection.prototype.getWriteTransaction = function () {
        var self = this;

        return Q.Promise(function (resolve, reject) {
            if (!self.isConnected()) {
                return reject(new Error('Соединение с БД не установлено'));
            }

            // Откроем пишущую транзакцию
            self.database.transaction(FBDriver.ISOLATION_WRITE, function (err, fbTransaction) {
                if (err) {
                    reject(err);
                    return;
                }

                var wrapper = new Transaction(fbTransaction);
                resolve(wrapper);
            });
        });
    };

    /**
     * Выполнить запрос на указанной транзакции
     *
     * @param transaction {Transaction}  Транзакция
     * @param sql         {String}       Текст запроса
     * @param params      {Array}        Массив параметров запроса
     * @promise {data}
     */
    Connection.prototype.query = function (transaction, sql, params) {
        return utils.query(transaction, sql, params);
    };

    /**
     * Выполнить запрос на читающей транзакции
     *
     * @param sql    Текст запроса
     * @param params Массив параметров запроса
     * @promise {data}
     */
    Connection.prototype.queryRead = function (sql, params) {
        // Берем читающую транзакцию
        return this.getReadTransaction().then(function (tr) {
            // Выполняем запрос
            return utils.query(tr, sql, params);
        });
    };

    /**
     * Выполнить запрос на пишущей транзакции и сразу закомитить ее
     *
     * @param sql    Текст запроса
     * @param params Массив параметров запроса
     * @promise {data}
     */
    Connection.prototype.queryWrite = function (sql, params) {
        // Берем новую пищущую транзакцию
        return this.getWriteTransaction().then(function (tr) {
            // Выполняем запрос
            return utils.query(tr, sql, params)
                // Закомитим транзакцию, потом вернем результат запроса
                .then(function (result) {
                    return tr.commit()
                        .then(function () {
                            return result;
                        });
                })
                // В случае ошибки откатим транзакцию и, одновременно, перебросим ошибку
                .catch(function (e) {
                    tr.rollback();
                    throw e;
                });
        });
    };

    /**
     * Создание prepared statement
     *
     * @param transactionWrapper Транзакция
     * @param sql         Текст запроса
     * @promise {PreparedStatement}
     */
    Connection.prototype.prepareStatement = function (transactionWrapper, sql) {
        return Q.Promise(function (resolve, reject) {
            transactionWrapper.transaction.newStatement(sql, function (err, statement) {
                if (err) {
                    reject(err);
                    return;
                }

                var wrapper = new PreparedStatement(transactionWrapper, statement);
                resolve(wrapper);
            });
        });
    };

    /**
     * Создание prepared statement на читающей транзакции
     *
     * @param sql Текст запроса
     * @promise {PreparedStatement}
     */
    Connection.prototype.prepareReadStatement = function (sql) {
        var self = this;
        // Берем читающую транзакцию
        return this.getReadTransaction().then(function (tr) {
            return self.prepareStatement(tr, sql);
        });
    };
})();