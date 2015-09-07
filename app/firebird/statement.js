(function () {
    'use strict';

    var Promise = require('bluebird');
    var utils = require('./utils');

    module.exports = PreparedStatement;

    /**
     * Обертка для Prepared statement
     *
     * @param connection  Соединение
     * @param transactionWrapper Транзакция
     * @param driverStatement   FB prepared statement
     * @constructor
     */
    function PreparedStatement(connection, transactionWrapper, driverStatement) {
        this.connection = connection;
        this.transaction = transactionWrapper.transaction;
        this.statement = driverStatement;
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
        utils.updateLastActive(self.connection);

        return new Promise(function (resolve, reject) {
            self.statement.execute(self.transaction, params, function (err) {
                if (err) {
                    return reject(err);
                }

                switch (self.statement.type) {
                    // SELECT выражение
                    case ISC_INFO_SQL_STMT_SELECT:
                        // Если выражение что-то возвращает, то заберем результат ...
                        if (self.statement.output && self.statement.output.length) {
                            self.statement.fetchAll(self.transaction, function (err, ret) {
                                if (err) {
                                    return reject(err);
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
                                    return reject(err);
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
        utils.updateLastActive(this.connection);

        return Promise.promisify(this.statement.close.bind(this.statement))();
    };

    /**
     * Уничтожить prepared statement
     *
     * @promise {}
     */
    PreparedStatement.prototype.drop = function () {
        utils.updateLastActive(this.connection);

        return Promise.promisify(this.statement.drop.bind(this.statement))();
    };
})();
