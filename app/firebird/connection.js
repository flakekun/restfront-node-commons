(function() {
    'use strict';

    var Promise = require('bluebird');
    var FBDriver = require('node-firebird');
    var Transaction = require('./transaction');
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
        /** @member {Promise<Transaction>} */
        this.readTransactionPromise = null;

        this.options = utils.parseUrl(url);
        this.options.user = user;
        this.options.password = password;

        /** @member {Metadata} */
        this.metadata = new Metadata(this);
        /** @member {Migration} */
        this.migration = new Migration(this);

        // Время последней активности соединения
        this.lastActive = 0;
        utils.updateLastActive(this);
    }

    /**
     * Создать БД с данными соединения
     *
     * @promise {Connection}
     */
    Connection.prototype.create = function () {
        var self = this;
        utils.updateLastActive(self);

        return Promise.promisify(FBDriver.create.bind(FBDriver))(self.options)
            .then(function(db) {
                self.database = db;
                return self;
            });
    };

    /**
     * Открыть соединение с БД
     *
     * @promise {Connection}
     */
    Connection.prototype.open = function () {
        var self = this;
        utils.updateLastActive(self);

        return Promise.promisify(FBDriver.attach.bind(FBDriver))(self.options)
            .then(function(db) {
                self.database = db;
                return self;
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
     * @returns Promise
     */
    Connection.prototype.close = function () {
        var self = this;
        utils.updateLastActive(self);

        return new Promise(function (resolve, reject) {
            if (!self.isConnected()) {
                return reject(new Error('Соединение с БД не установлено'));
            }

            Promise.resolve()
                // Если была открыта читающая транзакция, то сначала откатим ее
                .then(function() {
                    if (self.readTransactionPromise) {
                        return self.readTransactionPromise
                            .then(function(transaction) {
                                return transaction.rollback();
                            });
                    }
                })
                // Отключаемся от БД
                .then(function () {
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
     *
     * @returns Promise<Transaction>
     */
    Connection.prototype.getReadTransaction = function () {
        var self = this;
        utils.updateLastActive(self);

        // Если еще не обращались к читающей транзакции, то создадим Promise который будет содержать в себе читающую транзакцию
        if (!self.readTransactionPromise) {
            self.readTransactionPromise = new Promise(function (resolve, reject) {
                if (!self.isConnected()) {
                    return reject(new Error('Соединение с БД не установлено'));
                }

                // Откроем читающую транзакцию и запомним ее в этом соединении
                self.database.transaction(FBDriver.ISOLATION_READ, function (err, fbTransaction) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(new Transaction(self, fbTransaction));
                });
            });
        }

        return self.readTransactionPromise;
    };

    /**
     * Получить пишущую транзакцию
     *
     * @returns Promise<Transaction>
     */
    Connection.prototype.getWriteTransaction = function () {
        var self = this;
        utils.updateLastActive(self);

        return new Promise(function (resolve, reject) {
            if (!self.isConnected()) {
                return reject(new Error('Соединение с БД не установлено'));
            }

            // Откроем пишущую транзакцию
            self.database.transaction(FBDriver.ISOLATION_WRITE, function (err, fbTransaction) {
                if (err) {
                    return reject(err);
                }

                resolve(new Transaction(self, fbTransaction));
            });
        });
    };

    /**
     * Выполнить запрос на указанной транзакции
     *
     * @param transaction {Transaction}  Транзакция
     * @param sql         {String}       Текст запроса
     * @param [params]    {Array}        Массив параметров запроса
     * @returns Promise<Array>
     */
    Connection.prototype.query = function (transaction, sql, params) {
        utils.updateLastActive(this);

        return transaction.query(sql, params);
    };

    /**
     * Выполнить запрос на читающей транзакции
     *
     * @param sql      {String}  Текст запроса
     * @param [params] {Array}   Массив параметров запроса
     * @returns Promise<Array>
     */
    Connection.prototype.queryRead = function (sql, params) {
        utils.updateLastActive(this);

        // Берем читающую транзакцию
        return this.getReadTransaction().then(function (transaction) {
            // Выполняем запрос
            return transaction.query(sql, params);
        });
    };

    /**
     * Выполнить запрос на пишущей транзакции и сразу закомитить ее
     *
     * @param sql      {String}  Текст запроса
     * @param [params] {Array}   Массив параметров запроса
     * @returns Promise<Array>
     */
    Connection.prototype.queryWrite = function (sql, params) {
        utils.updateLastActive(this);

        // Берем новую пищущую транзакцию
        return this.getWriteTransaction().then(function (transaction) {
            // Выполняем запрос
            return transaction.query(sql, params)
                // Закомитим транзакцию, потом вернем результат запроса
                .then(function (result) {
                    return transaction.commit()
                        .then(function () {
                            return result;
                        });
                })
                // В случае ошибки откатим транзакцию и, одновременно, перебросим ошибку
                .catch(function (e) {
                    return transaction.rollback()
                        .finally(function() {
                            throw e;
                        });
                });
        });
    };

    /**
     * Создание prepared statement
     *
     * @param transactionWrapper Транзакция
     * @param sql         Текст запроса
     * @returns Promise<PreparedStatement>
     */
    Connection.prototype.prepareStatement = function (transactionWrapper, sql) {
        utils.updateLastActive(this);

        return transactionWrapper.prepareStatement(sql);
    };

    /**
     * Создание prepared statement на читающей транзакции
     *
     * @param sql Текст запроса
     * @returns Promise<PreparedStatement>
     */
    Connection.prototype.prepareReadStatement = function (sql) {
        var self = this;
        utils.updateLastActive(self);

        // Берем читающую транзакцию
        return this.getReadTransaction().then(function (tr) {
            return self.prepareStatement(tr, sql);
        });
    };

    /**
     * Сколько мс соединение простаивало
     * @returns {number}
     */
    Connection.prototype.getInactiveTime = function() {
        return Date.now() - this.lastActive;
    };
})();