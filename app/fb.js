/**
 * FB
 * @module fb
 */

(function () {
    'use strict';

    var Firebird = require('node-firebird');
    var Q = require('q');
    var moment = require('moment');

    module.exports = new FB();

    /**
     *
     * @constructor
     */
    function FB() {

    }

    /**
     * Создать подключение к БД
     *
     * @param url       Путь к БД
     * @param user      Пользователь
     * @param password  Пароль
     * @returns {Connection}
     */
    FB.prototype.createConnection = function (url, user, password) {
        return new Connection(url, user, password);
    };

    FB.prototype.parseUrl = parseUrl;

    FB.prototype.escape = Firebird.escape;

    /**
     * Подключение к БД
     *
     * @param url       Путь к БД
     * @param user      Пользователь
     * @param password  Пароль
     * @constructor
     */
    function Connection(url, user, password) {
        this.database = null;
        /** @member {Transaction} */
        this.readTransaction = null;

        this.options = parseUrl(url);
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
     * @promise {}
     */
    Connection.prototype.open = function () {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            Firebird.attach(self.options, function (err, db) {
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
     * @promise {}
     */
    Connection.prototype.close = function () {
        checkConnected(this);

        var self = this;
        return Q.Promise(function (resolve, reject) {
            function detach() {
                self.database.detach(function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    self.database = null;
                    resolve();
                });
            }

            // Если была открыта читающая транзакция, то сначала откатим ее
            var promise = self.readTransaction ? self.readTransaction.rollback() : Q.resolve();
            promise.then(detach);
        });
    };

    /**
     * Получить читающую транзакцию
     * @promise {Transaction}
     */
    Connection.prototype.getReadTransaction = function () {
        checkConnected(this);

        var self = this;
        return Q.Promise(function (resolve, reject) {
            // Если читающая транзакция есть, то сразу отдадим ее
            if (self.readTransaction) {
                return resolve(self.readTransaction);
            }

            // Откроем читающую транзакцию и запомним ее в этом соединении
            self.database.transaction(Firebird.ISOLATION_READ, function (err, fbTransaction) {
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
        checkConnected(this);

        var self = this;
        return Q.Promise(function (resolve, reject) {
            // Откроем пишущую транзакцию
            self.database.transaction(Firebird.ISOLATION_WRITE, function (err, fbTransaction) {
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
     * @param transaction Транзакция
     * @param sql         Текст запроса
     * @param params      Массив параметров запроса
     * @promise {data}
     */
    Connection.prototype.query = function (transaction, sql, params) {
        return query(transaction, sql, params);
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
            return query(tr, sql, params);
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
            return query(tr, sql, params)
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
        return Q.Promise(function (resolve, reject, notify) {
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

    /**
     * Обертка над Firebird транзакцией
     *
     * @param transaction Firebird транзакция
     * @constructor
     */
    function Transaction(transaction) {
        this.transaction = transaction;
    }

    /**
     * Коммит транзакции
     *
     * @promise {}
     */
    Transaction.prototype.commit = function () {
        var self = this;
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

    /**
     * Обертка для Prepared statement
     *
     * @param transactionWrapper Транзакция
     * @param statement   FB prepared statement
     * @constructor
     */
    function PreparedStatement(transactionWrapper, statement) {
        this.transaction = transactionWrapper.transaction;
        this.statement = statement;
    }

    /**
     * Выполнение prepared statement
     *
     * @param params       Параметры выполнения
     * @promise {data}
     */
    PreparedStatement.prototype.execute = function (params) {
        // Типы выражений (взято из node-firebird)
        var ISC_INFO_SQL_STMT_SELECT = 1,
            ISC_INFO_SQL_STMT_EXEC_PROCEDURE = 8;

        var self = this;
        return Q.Promise(function (resolve, reject, notify) {
            self.statement.execute(self.transaction, params, function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                switch (self.statement.type) {
                    // SELECT выражение
                    case ISC_INFO_SQL_STMT_SELECT:
                        // Если выражение что-то возвращает, то заберем результат ...
                        if (self.statement.output && self.statement.output.length) {
                            self.statement.fetchAll(self.transaction, function (err, ret) {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                resolve(ret);
                            });
                        } else {
                            resolve([]);  // Ответим пустым массивом
                        }
                        break;

                    // EXECUTE PROCEDURE выражение
                    case ISC_INFO_SQL_STMT_EXEC_PROCEDURE:
                        // Если выражение что-то возвращает, то заберем результат ...
                        if (self.statement.output.length) {
                            self.statement.fetch(self.transaction, 1, function (err, ret) {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                resolve(ret.data);
                            });
                        } else {
                            resolve([]);  // Ответим пустым массивом
                        }
                        break;

                    default:
                        resolve([]);  // Ответим пустым массивом
                        break;
                }


            }, {asObject: true, asStream: false});
        });
    };

    /**
     * Закрыть выполненный prepared statement
     *
     * @promise {}
     */
    PreparedStatement.prototype.close = function () {
        var self = this;
        return Q.Promise(function (resolve, reject, notify) {
            self.statement.close(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };

    /**
     * Уничтожить prepared statement
     *
     * @promise {}
     */
    PreparedStatement.prototype.drop = function () {
        var self = this;
        return Q.Promise(function (resolve, reject, notify) {
            self.statement.drop(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };

    /**
     * Вспомогательные методы для миграций
     */
    function Migration(connection) {
        this.connection = connection;
    }

    /**
     * Инициализация метаданных для поддержки миграций
     *
     * @promise
     */
    Migration.prototype.init = function () {
        var self = this;

        // Проверяем существование таблицы миграций
        return this.connection.metadata.tableExists('rf_migration')
            .then(function (exists) {
                if (!exists) {
                    // Если не существует, то на пишущей транзакции создаем ее
                    return self.connection.getWriteTransaction()
                        .then(function (transaction) {
                            var tableSql =
                                "CREATE TABLE rf_migration (" +
                                "  id BIGINT NOT NULL, " +
                                "  name VARCHAR(255) NOT NULL, " +
                                "  migrationdate DATE, " +
                                "  author VARCHAR(1024), " +
                                "  executeddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL " +
                                ")";

                            return query(transaction, tableSql)
                                .then(function () {
                                    return query(transaction, "ALTER TABLE rf_migration ADD CONSTRAINT rf_pk_migration PRIMARY KEY (id)");
                                })
                                .then(transaction.commit.bind(transaction));
                        });
                }
            });
    };

    /**
     * Проверка, была ли проведена миграция с таким идентификатором
     *
     * @param id ИД миграции
     * @promise {Boolean}
     */
    Migration.prototype.check = function (id) {
        var sql = "SELECT id FROM rf_migration WHERE id = ?";

        return this.connection.queryRead(sql, [id])
            .then(function (result) {
                return result && result.length > 0;
            });
    };

    /**
     * Добавить запись о проведении миграции
     *
     * @param transaction    Транзакция
     * @param id             ИД миграции
     * @param name           Имя миграции
     * @param migrationDate  Дата миграции
     * @param author         Автор миграции
     */
    Migration.prototype.log = function (transaction, id, name, migrationDate, author) {
        var sql = "INSERT INTO rf_migration (id, name, migrationdate, author) VALUES(?, ?, ?, ?)";
        return query(transaction, sql, [id, name, moment(migrationDate).toDate(), author]);
    };

    /**
     * Методы для работы с метаданными
     */
    function Metadata(connection) {
        this.connection = connection;
    }

    Metadata.prototype.generatorExists = function (generatorName) {
        if (!generatorName) { return Q.resolve(false); }

        var sql = "SELECT rdb$generator_name FROM rdb$generators WHERE rdb$generator_name = ?";
        return this.connection.queryRead(sql, [generatorName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.domainExists = function (domainName) {
        if (!domainName) { return Q.resolve(false); }

        var sql = "SELECT rdb$field_name FROM rdb$fields WHERE rdb$field_name = ?";
        return this.connection.queryRead(sql, [domainName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.tableExists = function (tableName) {
        if (!tableName) { return Q.resolve(false); }

        var sql = "SELECT rdb$relation_name FROM rdb$relations WHERE rdb$relation_name = ?";
        return this.connection.queryRead(sql, [tableName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.fieldExists = function (tableName, fieldName) {
        if (!tableName || !fieldName) { return Q.resolve(false); }

        var sql = "SELECT rdb$relation_name FROM rdb$relation_fields WHERE rdb$relation_name = ? AND rdb$field_name = ?";
        return this.connection.queryRead(sql, [tableName.toUpperCase(), fieldName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.indexExists = function (indexName) {
        if (!indexName) { return Q.resolve(false); }

        var sql = "SELECT rdb$index_name FROM rdb$indices WHERE rdb$index_name = ?";
        return this.connection.queryRead(sql, [indexName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.procedureExists = function (procedureName) {
        if (!procedureName) { return Q.resolve(false); }

        var sql = "SELECT rdb$procedure_name FROM rdb$procedures WHERE rdb$procedure_name = ?";
        return this.connection.queryRead(sql, [procedureName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.triggerExists = function (triggerName) {
        if (!triggerName) { return Q.resolve(false); }

        var sql = "SELECT rdb$trigger_name FROM rdb$triggers WHERE rdb$trigger_name = ?";
        return this.connection.queryRead(sql, [triggerName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.exceptionExists = function (exceptionName) {
        if (!exceptionName) { return Q.resolve(false); }

        var sql = "SELECT rdb$exception_name FROM rdb$exceptions WHERE rdb$exception_name = ?";
        return this.connection.queryRead(sql, [exceptionName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };


    /**
     * Проверка активности соединения, если не активно - бросаем исключение
     *
     * @param connection Соединение
     */
    function checkConnected(connection) {
        if (!connection.isConnected()) {
            throw new Error('Not connected to database');
        }
    }

    /**
     * Выполнить запрос на указанной транзакции
     * @param transactionWrapper Транзакция
     * @param sql         Текст запроса
     * @param params      Массив параметров запроса
     * @promise {data}
     */
    function query(transactionWrapper, sql, params) {
        return Q.Promise(function (resolve, reject, notify) {
            transactionWrapper.transaction.query(sql, params, function (err, result) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            });
        });
    }

    /**
     * Разбор строки пути к БД
     *
     * @param url Путь к БД
     * @returns {*}
     */
    function parseUrl(url) {
        if (!url) {
            return null;
        }

        var result = {
            host: '',
            port: '',
            database: ''
        };

        var hostNameEndIndex, portEndIndex;
        hostNameEndIndex = url.indexOf(':');
        if (hostNameEndIndex > 1) {
            result.host = url.substr(0, hostNameEndIndex);
            result.database = url.substr(hostNameEndIndex + 1, url.length);

            portEndIndex = result.host.indexOf('/');
            if (portEndIndex >= 0) {
                result.port = result.host.substr(portEndIndex + 1, result.host.length);
                result.host = result.host.substr(0, portEndIndex);
            }
        } else {
            result.database = url;
        }

        return result;
    }
})();