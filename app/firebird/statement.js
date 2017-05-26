(function () {
    'use strict';

    const Promise = require('bluebird');
    const utils = require('./utils');

    // Типы выражений (взято из node-firebird)
    const
        ISC_INFO_SQL_STMT_SELECT = 1,
        ISC_INFO_SQL_STMT_EXEC_PROCEDURE = 8;

    /**
     * Обертка для Prepared statement
     */
    class PreparedStatement {
        /**
         * @param connection  Соединение
         * @param transactionWrapper Транзакция
         * @param driverStatement   FB prepared statement
         * @constructor
         */
        constructor(connection, transactionWrapper, driverStatement) {
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
        execute(params) {
            utils.updateLastActive(this.connection);

            return new Promise((resolve, reject) => {
                this.statement.execute(this.transaction, params, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    switch (this.statement.type) {
                        // SELECT выражение
                        case ISC_INFO_SQL_STMT_SELECT:
                            // Если выражение что-то возвращает, то заберем результат ...
                            if (this.statement.output && this.statement.output.length) {
                                this.statement.fetchAll(this.transaction, (err, ret) => {
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
                            if (this.statement.output.length) {
                                this.statement.fetch(this.transaction, 1, (err, ret) => {
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
        }

        /**
         * Закрыть выполненный prepared statement
         *
         * @promise {}
         */
        close() {
            utils.updateLastActive(this.connection);

            return Promise.promisify(this.statement.close.bind(this.statement))();
        }

        /**
         * Уничтожить prepared statement
         *
         * @promise {}
         */
        drop() {
            utils.updateLastActive(this.connection);

            return Promise.promisify(this.statement.drop.bind(this.statement))();
        }
    }

    module.exports = PreparedStatement;
})();
