(function () {
    'use strict';

    const MomentUtils = require('../utils/momentUtils');

    /**
     * Вспомогательные методы для миграций
     */
    class Migration {
        constructor(connection) {
            this.connection = connection;
        }

        /**
         * Инициализация метаданных для поддержки миграций
         *
         * @promise
         */
        init() {
            // Подготавливаем метаданные миграций
            return __initMetadata01(this.connection)
                .then(() => __initMetadata02(this.connection));
        }

        /**
         * Проверка, была ли проведена миграция с таким идентификатором
         *
         * @param {String}  project  Название проекта
         * @param {Number}  id       ИД миграции
         * @promise {Boolean}
         */
        check(project, id) {
            // language=SQL
            const sql = `
                SELECT 
                  id 
                FROM 
                  rf_migration 
                WHERE 
                  project = ?
                  AND id = ?
            `;
            const params = [
                project || '',
                id
            ];
            return this.connection.queryRead(sql, params)
                .then((result) => result && result.length > 0);
        }

        /**
         * Добавить запись о проведении миграции
         *
         * @param {Transaction}  transaction    Транзакция
         * @param {String}  project        Название проекта
         * @param {Number}  id             ИД миграции
         * @param {String}  name           Имя миграции
         * @param {String}  migrationDate  Дата миграции
         * @param {String}  author         Автор миграции
         */
        log(transaction, project, id, name, migrationDate, author) {
            migrationDate = migrationDate ? MomentUtils.parseDate(migrationDate).toDate() : null;

            // language=SQL
            const sql = `
                INSERT INTO rf_migration (
                  project, id, name, migrationdate, author) 
                VALUES(
                  ?, ?, ?, ?, ?)
            `;
            const params = [
                project || '',
                id,
                name,
                migrationDate,
                author
            ];
            return transaction.query(sql, params);
        }
    }

    /**
     * Создание таблицы rf_migration
     *
     * @param {Connection}  connection
     * @return {Promise.<>}
     * @private
     */
    function __initMetadata01(connection) {
        return connection.metadata.tableExists('rf_migration')
            .then((exists) => {
                if (exists) {
                    return;
                }

                // Если не существует, то на пишущей транзакции создаем ее
                return connection.onWriteTransaction((transaction) => {
                    const tableSql = `
                        CREATE TABLE rf_migration (
                          id BIGINT NOT NULL, 
                          name VARCHAR(255) NOT NULL, 
                          migrationdate DATE, 
                          author VARCHAR(1024), 
                          executeddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL 
                    )`;

                    return transaction.query(tableSql)
                        .then(() => transaction.query(`ALTER TABLE rf_migration ADD CONSTRAINT rf_pk_migration PRIMARY KEY (id)`));
                });
            });
    }

    /**
     * Обновление rf_migration: добавление поля project + включение его в PK
     *
     * @param {Connection}  connection
     * @return {Promise.<>}
     * @private
     */
    function __initMetadata02(connection) {
        return connection.metadata.fieldExists('rf_migration', 'project')
            .then((exists) => {
                if (exists) {
                    return;
                }

                return connection.onWriteTransaction((transaction) => {
                    return Promise.resolve()
                        .then(() => transaction.query(`ALTER TABLE rf_migration DROP CONSTRAINT rf_pk_migration`))
                        .then(() => transaction.query(`ALTER TABLE rf_migration ADD project VARCHAR(255) DEFAULT '' NOT NULL`))
                        .then(() => transaction.query(`UPDATE rf_migration SET project = ''`))
                        .then(() => transaction.query(`ALTER TABLE rf_migration ADD CONSTRAINT rf_pk_migration PRIMARY KEY (project, id)`));
                });
            });
    }

    module.exports = Migration;
})();
