(function() {
    'use strict';

    var Promise = require('bluebird');
    var _ = require('underscore');
    var Log = require('restfront-node-commons').log;

    module.exports.run = function (connection, migration) {
        // Проверяем правильность миграции
        return Promise.method(validateMigration)(migration)

            // Проверяем необходимость миграции
            .then(function () {
                return connection.migration.check(migration.data.id);
            })

            // Если необходимо - проводим миграцию
            .then(function (exists) {
                if (exists) {
                    return;
                }

                Log.info('Миграция %d "%s"', migration.data.id, migration.data.name);

                // Откроем пишущую транзакцию
                return connection.getWriteTransaction()
                    .then(function (tr) {

                        // Выполняем миграцию на пишущей транзакции
                        return migration.action(connection, tr)

                            // Сохраним информацию о проведенной миграции
                            .then(function () {
                                return connection.migration.log(tr, migration.data.id, migration.data.name, migration.data.date, migration.data.author);
                            })

                            // Коммитим транзакцию
                            .then(tr.commit.bind(tr))

                            // При ошибке откатим транзакцию и перебросим исключение выше
                            .catch(function (e) {
                                tr.rollback();
                                throw e;
                            });
                    });
            })

            // Обработка исключений в миграции
            .catch(function (e) {
                Log.error('Ошибка при выполнении миграции %d "%s": \n', migration.id, migration.name, e);
                throw e;
            });
    };

    function validateMigration(migration) {
        if (!_.isObject(migration.data) || !_.isFunction(migration.action)) {
            throw new Error('Миграция должна экспортировать данные "data" и функцию "action"');
        }
    }
})();