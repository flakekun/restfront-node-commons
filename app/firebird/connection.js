(function () {
    'use strict';

    const Promise = require('bluebird');
    const FBDriver = require('node-firebird-dev');
    const Transaction = require('./transaction');
    const Metadata = require('./metadata');
    const Migration = require('./migration');
    const utils = require('./utils');

    /* Типы транзакций (взято из node-firebird) */
    const ISOLATION_READ = [
        /* ISC_tpb_version3 */ 3,
        /* ISC_tpb_read */ 8,
        /* ISC_tpb_read_committed */ 15,
        /* ISC_tpb_rec_version */ 17
    ];
    const ISOLATION_WRITE = [
        /* ISC_tpb_version3 */ 3,
        /* ISC_tpb_write */ 9,
        /* ISC_tpb_nowait */ 7,
        /* ISC_tpb_read_committed */ 15,
        /* ISC_tpb_rec_version */ 17
    ];
    const ISOLATION_SNAPSHOT = [
        /* ISC_tpb_version3 */ 3,
        /* ISC_tpb_write */ 9,
        /* ISC_tpb_nowait */ 7,
        /* isc_tpb_concurrency */ 2
    ];

    /**
     * Подключение к БД
     */
    class Connection {
        /**
         * @param {String} url       Строка подключения к БД
         * @param {String} user      Пользователь
         * @param {String} password  Пароль
         * @constructor
         */
        constructor(url, user, password) {
            this.database = null;
            /** @member {Promise.<Transaction>} */
            this.readTransactionPromise = null;

            this.options = utils.parseUrl(url);
            this.options.user = user;
            this.options.password = password;
            this.options.lowercase_keys = true;

            /** @member {Metadata} */
            this.metadata = new Metadata(this);
            /** @member {Migration} */
            this.migration = new Migration(this);
        }

        /**
         * Создать БД с данными соединения
         *
         * @promise {Connection}
         */
        create() {
            return Promise.promisify(FBDriver.create, {context: FBDriver})(this.options)
                .then((db) => {
                    this.database = db;
                    return this;
                });
        }

        /**
         * Открыть соединение с БД
         *
         * @promise {Connection}
         */
        open() {
            return Promise.promisify(FBDriver.attach, {context: FBDriver})(this.options)
                .then((db) => {
                    this.database = db;
                    return this;
                });
        }

        /**
         * Проверить активно ли соединение с БД
         *
         * @returns {boolean}
         */
        isConnected() {
            return this.database != null;
        }

        /**
         * Закрыть соединение с БД
         *
         * @returns Promise
         */
        close() {
            return new Promise((resolve, reject) => {
                if (!this.isConnected()) {
                    return reject(new Error('Соединение с БД не установлено'));
                }

                Promise.resolve()
                // Если была открыта читающая транзакция, то сначала откатим ее
                    .then(() => {
                        if (this.readTransactionPromise) {
                            return this.readTransactionPromise
                                .then((transaction) => transaction.rollback());
                        }
                    })
                    // Отключаемся от БД
                    .then(() => {
                        this.database.detach((err) => {
                            if (err) {
                                return reject(err);
                            }

                            this.database = null;
                            resolve();
                        });
                    });
            });
        }

        /**
         * Получить читающую транзакцию
         *
         * @returns Promise.<Transaction>
         */
        getReadTransaction() {
            // Если еще не обращались к читающей транзакции, то создадим Promise который будет содержать в себе читающую транзакцию
            if (!this.readTransactionPromise) {
                this.readTransactionPromise = new Promise((resolve, reject) => {
                    if (!this.isConnected()) {
                        return reject(new Error('Соединение с БД не установлено'));
                    }

                    // Откроем читающую транзакцию и запомним ее в этом соединении
                    this.database.transaction(ISOLATION_READ, (err, innerTransaction) => {
                        if (err) {
                            return reject(err);
                        }

                        resolve(new Transaction(this, innerTransaction));
                    });
                });
            }

            return this.readTransactionPromise;
        }

        /**
         * Получить пишущую транзакцию
         *
         * @returns Promise.<Transaction>
         */
        getWriteTransaction() {
            return new Promise((resolve, reject) => {
                if (!this.isConnected()) {
                    return reject(new Error('Соединение с БД не установлено'));
                }

                // Откроем пишущую транзакцию
                this.database.transaction(ISOLATION_WRITE, (err, fbTransaction) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(new Transaction(this, fbTransaction));
                });
            });
        }

        /**
         * Получить пишущую SNAPSHOT транзакцию
         *
         * @returns Promise.<Transaction>
         */
        getSnapshotTransaction() {
            return new Promise((resolve, reject) => {
                if (!this.isConnected()) {
                    return reject(new Error('Соединение с БД не установлено'));
                }

                // Откроем пишущую SNAPSHOT транзакцию
                this.database.transaction(ISOLATION_SNAPSHOT, (err, fbTransaction) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(new Transaction(this, fbTransaction));
                });
            });
        }

        /**
         * Выполнить запрос на указанной транзакции
         *
         * @param transaction {Transaction}  Транзакция
         * @param sql         {String}       Текст запроса
         * @param [params]    {Array}        Массив параметров запроса
         * @returns Promise.<Array>
         */
        query(transaction, sql, params) {
            return transaction.query(sql, params);
        }

        /**
         * Выполнить запрос на читающей транзакции
         *
         * @param sql      {String}  Текст запроса
         * @param [params] {Array}   Массив параметров запроса
         * @returns Promise.<Array>
         */
        queryRead(sql, params) {
            // Берем читающую транзакцию
            return this.getReadTransaction()
            // Выполняем запрос
                .then((transaction) => transaction.query(sql, params));
        }

        /**
         * Выполнить запрос на пишущей транзакции и сразу закомитить ее
         *
         * @param sql      {String}  Текст запроса
         * @param [params] {Array}   Массив параметров запроса
         * @returns Promise.<Array>
         */
        queryWrite(sql, params) {
            // Берем новую пищущую транзакцию
            return this.getWriteTransaction()
                .then((transaction) => {
                    // Выполняем запрос
                    return transaction.query(sql, params)

                        // Закомитим транзакцию, потом вернем результат запроса
                        .then((result) => {
                            return transaction.commit()
                                .then(() => result);
                        })

                        // В случае ошибки откатим транзакцию и, одновременно, перебросим ошибку
                        .catch((e) => {
                            return transaction.rollback()
                                .finally(() => {
                                    throw e;
                                });
                        });
                });
        }

        /**
         * Выполнить запрос на SNAPSHOT транзакции и сразу закомитить ее
         *
         * @param sql      {String}  Текст запроса
         * @param [params] {Array}   Массив параметров запроса
         * @returns Promise.<Array>
         */
        querySnapshot(sql, params) {
            // Берем новую пищущую транзакцию
            return this.getSnapshotTransaction()
                .then((transaction) => {
                    // Выполняем запрос
                    return transaction.query(sql, params)

                    // Закомитим транзакцию, потом вернем результат запроса
                        .then((result) => {
                            return transaction.commit()
                                .then(() => result);
                        })

                        // В случае ошибки откатим транзакцию и, одновременно, перебросим ошибку
                        .catch((e) => {
                            return transaction.rollback()
                                .finally(() => {
                                    throw e;
                                });
                        });
                });
        }

        /**
         * Выполнить пишущие действия на основном соединении
         * @param {Function<Promise>} action Действия
         * @returns {Promise.<T>}
         */
        onWriteTransaction(action) {
            return this.getWriteTransaction()
                .then((transaction) => {

                    // Выполним полезную работу
                    return action(transaction)

                        // Коммит и возврат результата
                        .then((actionResult) => {
                            return transaction.commit()
                                .then(() => actionResult);
                        })

                        // Роллбэк и проброс ошибки
                        .catch((e) => {
                            return transaction.rollback()
                                .finally(() => {
                                    throw e;
                                });
                        });
                });
        }

        /**
         * Выполнить действия на SNAPSHOT транзакции на основном соединении
         * @param {Function<Promise>} action Действия
         * @returns {Promise.<T>}
         */
        onSnapshotTransaction(action) {
            return this.getSnapshotTransaction()
                .then((transaction) => {

                    // Выполним полезную работу
                    return action(transaction)

                    // Коммит и возврат результата
                        .then((actionResult) => {
                            return transaction.commit()
                                .then(() => actionResult);
                        })

                        // Роллбэк и проброс ошибки
                        .catch((e) => {
                            return transaction.rollback()
                                .finally(() => {
                                    throw e;
                                });
                        });
                });
        }

        /**
         * Создание prepared statement
         *
         * @param transactionWrapper Транзакция
         * @param sql         Текст запроса
         * @returns Promise<PreparedStatement>
         */
        prepareStatement(transactionWrapper, sql) {
            return transactionWrapper.prepareStatement(sql);
        }

        /**
         * Создание prepared statement на читающей транзакции
         *
         * @param sql Текст запроса
         * @returns Promise<PreparedStatement>
         */
        prepareReadStatement(sql) {
            // Берем читающую транзакцию
            return this.getReadTransaction()
                .then((tr) => this.prepareStatement(tr, sql));
        }
    }

    module.exports = Connection;
})();