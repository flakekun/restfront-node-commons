(function () {
    'use strict';

    var MomentUtils = require('../utils/momentUtils');
    var utils = require('./utils');

    module.exports = Migration;

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

                            return transaction.query(tableSql)
                                .then(function () {
                                    return transaction.query("ALTER TABLE rf_migration ADD CONSTRAINT rf_pk_migration PRIMARY KEY (id)");
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
        migrationDate = migrationDate ? MomentUtils.fromDate(migrationDate).toDate() : null;

        var sql = "INSERT INTO rf_migration (id, name, migrationdate, author) VALUES(?, ?, ?, ?)";
        return transaction.query(sql, [id, name, migrationDate, author]);
    };
})();
