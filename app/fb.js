(function () {
    'use strict';

    var fb = require('node-firebird');
    var q = require('q');
    var moment = require('moment');

    var fbPool, fbReadTransaction;

    var Pool = exports.pool = {
        init: function (url, user, password, maxConnections) {
            if (fbPool) {
                this.close();
            }

            maxConnections = maxConnections || 20;

            var options = exports.utils.parseUrl(url);
            options.user = user;
            options.password = password;

            fbPool = fb.pool(maxConnections, options);
        },

        isInited: function () {
            return (fbPool != null);
        },

        close: function () {
            var tr = fbReadTransaction;
            var pool = fbPool;
            fbReadTransaction = null;
            fbPool = null;

            return Transaction.rollback(tr)
                .finally(pool.destroy);
        }
    };

    var Transaction = exports.tr = {
        getRead: function () {
            return q.Promise(function (resolve, reject) {
                // Если читающая транзакция есть, то сразу отдадим ее
                if (fbReadTransaction) {
                    return resolve(fbReadTransaction);
                }

                // Соединимся с БД
                fbPool.get(function (err, db) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Откроем читающую транзакцию
                    db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        fbReadTransaction = transaction;
                        resolve(transaction);
                    });
                });
            });
        },

        getWrite: function () {
            return q.Promise(function (resolve, reject) {
                fbPool.get(function (err, db) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Откроем пишущую транзакцию
                    db.transaction(fb.ISOLATION_WRITE, function (err, transaction) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        resolve(transaction);
                    });
                });
            });
        },

        commit: function (transaction) {
            return q.Promise(function (resolve, reject) {
                if (!transaction) {
                    resolve();
                }

                transaction.commit(function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Отключимся от БД
                    transaction.db.detach(function () {
                        resolve();
                    });
                });
            });
        },

        rollback: function (transaction) {
            return q.Promise(function (resolve, reject) {
                if (!transaction) {
                    resolve();
                }

                transaction.rollback(function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Отключимся от БД
                    transaction.db.detach(function () {
                        resolve();
                    });
                });
            });
        }
    };

    var Sql = exports.sql = {
        /**
         * Выполнить запрос на указанной транзакции
         * @param transaction Транзакция
         * @param sql         Текст запроса
         * @param params      Массив параметров запроса
         * @promise {data}
         */
        query: function (transaction, sql, params) {
            return q.Promise(function (resolve, reject, notify) {
                transaction.query(sql, params, function (err, result) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(result);
                });
            });
        },

        /**
         * Выполнить запрос на читающей транзакции
         * @param sql    Текст запроса
         * @param params Массив параметров запроса
         * @promise {data}
         */
        queryRead: function (sql, params) {
            // Берем читающую транзакцию
            return Transaction.getRead().then(function (tr) {
                // Выполняем запрос
                return Sql.query(tr, sql, params);
            });
        },

        /**
         * Выполнить запрос на пишущей транзакции и сразу закомитить ее
         * @param sql    Текст запроса
         * @param params Массив параметров запроса
         * @promise {data}
         */
        queryWrite: function (sql, params) {
            // Берем новую пищущую транзакцию
            return Transaction.getWrite().then(function (tr) {
                // Выполняем запрос
                return Sql.query(tr, sql, params)
                    // Закомитим транзакцию, потом вернем результат запроса
                    .then(function (result) {
                        return Transaction.commit(tr)
                            .then(function() {
                                return result;
                            });
                    })
                    // В случае ошибки откатим транзакцию и, одновременно, перебросим ошибку
                    .catch(function (e) {
                        Transaction.rollback(tr);
                        throw e;
                    });
            });
        },

        /**
         * Создание prepared statement
         * @param transaction Транзакция
         * @param sql         Текст запроса
         * @promise {Statement}
         */
        prepare: function (transaction, sql) {
            return q.Promise(function (resolve, reject, notify) {
                transaction.newStatement(sql, function (err, statement) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(statement);
                });
            });
        },

        /**
         * Выполнение подготовленной ранее prepared statement
         * @param transaction  Транзакция
         * @param statement    Statement
         * @param params       Параметры выполнения
         * @promise {data}
         */
        execute: function (transaction, statement, params) {
            // Типы выражений (взято из node-firebird)
            var ISC_INFO_SQL_STMT_SELECT = 1,
                ISC_INFO_SQL_STMT_EXEC_PROCEDURE = 8;

            return q.Promise(function (resolve, reject, notify) {
                statement.execute(transaction, params, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    switch (statement.type) {
                        // SELECT выражение
                        case ISC_INFO_SQL_STMT_SELECT:
                            // Если выражение что-то возвращает, то заберем результат ...
                            if (statement.output && statement.output.length) {
                                statement.fetchAll(transaction, function (err, ret) {
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
                            if (statement.output.length) {
                                statement.fetch(transaction, 1, function (err, ret) {
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
        },

        close: function(statement) {
            return q.Promise(function (resolve, reject, notify) {
                statement.close(function (err, statement) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        }
    };

    var Utils = exports.utils = {
        parseUrl: function (url) {
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
    };

    /**
     * Вспомогательные методы для миграций
     */
    var Migration = exports.migration = {
        /**
         * Инициализация метаданных для поддержки миграций
         * @param transaction Соединение
         */
        init: function (transaction) {
            return Metadata.tableExists(transaction, 'rf_migration').then(function (exists) {
                if (!exists) {
                    var tableSql =
                        "CREATE TABLE rf_migration (" +
                        "  id BIGINT NOT NULL, " +
                        "  name VARCHAR(255) NOT NULL, " +
                        "  migrationdate DATE, " +
                        "  author VARCHAR(1024), " +
                        "  executeddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL " +
                        ")";
                    var primaryKeySql =
                        "ALTER TABLE rf_migration ADD CONSTRAINT rf_pk_migration PRIMARY KEY (id)";

                    return Sql.query(transaction, tableSql).then(function () {
                        return Sql.query(transaction, primaryKeySql);
                    });
                }
            });
        },

        /**
         * Проверка, была ли проведена миграция с таким идентификатором
         * @param id ИД миграции
         */
        check: function (id, transaction) {
            var sql = "SELECT id FROM rf_migration WHERE id = ?";

            if (transaction) {
                return Sql.query(transaction, sql, [id]).then(function (result) {
                    return result && result.length > 0;
                });
            } else {
                return Transaction.getRead().then(function (tr) {
                    return Sql.query(tr, sql, [id]).then(function (result) {
                        return result && result.length > 0;
                    });
                });
            }
        },

        /**
         * Добавить запись о проведении миграции
         * @param transaction    Соединение
         * @param id             ИД миграции
         * @param name           Имя миграции
         * @param migrationDate  Дата миграции
         * @param author         Автор миграции
         */
        log: function (transaction, id, name, migrationDate, author) {
            var sql = "INSERT INTO rf_migration (id, name, migrationdate, author) VALUES(?, ?, ?, ?)";
            return Sql.query(transaction, sql, [id, name, moment(migrationDate).toDate(), author]);
        }
    };

    /**
     * Методы для работы с метаданными
     */
    var Metadata = exports.metadata = {
        generatorExists: function (transaction, generatorName) {
            if (!generatorName) { return q.resolve(false); }
            var sql = "SELECT rdb$generator_name FROM rdb$generators WHERE rdb$generator_name = ?";
            return Sql.query(transaction, sql, [generatorName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        domainExists: function (transaction, domainName) {
            if (!domainName) { return q.resolve(false); }
            var sql = "SELECT rdb$field_name FROM rdb$fields WHERE rdb$field_name = ?";
            return Sql.query(transaction, sql, [domainName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        tableExists: function (transaction, tableName) {
            if (!tableName) { return q.resolve(false); }
            var sql = "SELECT rdb$relation_name FROM rdb$relations WHERE rdb$relation_name = ?";
            return Sql.query(transaction, sql, [tableName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        fieldExists: function (transaction, tableName, fieldName) {
            if (!tableName || !fieldName) { return q.resolve(false); }
            var sql = "SELECT rdb$relation_name FROM rdb$relation_fields WHERE rdb$relation_name = ? AND rdb$field_name = ?";
            return Sql.query(transaction, sql, [tableName.toUpperCase(), fieldName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        indexExists: function (transaction, indexName) {
            if (!indexName) { return q.resolve(false); }
            var sql = "SELECT rdb$index_name FROM rdb$indices WHERE rdb$index_name = ?";
            return Sql.query(transaction, sql, [indexName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        procedureExists: function (transaction, procedureName) {
            if (!procedureName) { return q.resolve(false); }
            var sql = "SELECT rdb$procedure_name FROM rdb$procedures WHERE rdb$procedure_name = ?";
            return Sql.query(transaction, sql, [procedureName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        triggerExists: function (transaction, triggerName) {
            if (!triggerName) { return q.resolve(false); }
            var sql = "SELECT rdb$trigger_name FROM rdb$triggers WHERE rdb$trigger_name = ?";
            return Sql.query(transaction, sql, [triggerName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        },

        exceptionExists: function (transaction, exceptionName) {
            if (!exceptionName) { return q.resolve(false); }
            var sql = "SELECT rdb$exception_name FROM rdb$exceptions WHERE rdb$exception_name = ?";
            return Sql.query(transaction, sql, [exceptionName.toUpperCase()]).then(function (result) {
                return result && result.length > 0;
            });
        }
    };
})();