(function () {
    'use strict';

    const Promise = require('bluebird');
    const _ = require('lodash');

    const Log = require('./log');

    module.exports = {
        run
    };

    function run(connection, migration) {
        // Проверяем правильность миграции
        return Promise.method(validateMigration)(migration)

            // Проверяем необходимость миграции
            .then(() => connection.migration.check(migration.data.project, migration.data.id))

            // Если необходимо - проводим миграцию
            .then((exists) => {
                if (exists) {
                    return;
                }

                Log.info('Миграция %d "%s"', migration.data.id, migration.data.name);

                // Откроем пишущую транзакцию
                return connection.onWriteTransaction((tr) => {

                    // Выполняем миграцию на пишущей транзакции
                    return migration.action(connection, tr)

                        // Сохраним информацию о проведенной миграции
                        .then(() => connection.migration.log(tr, migration.data.project, migration.data.id, migration.data.name, migration.data.date, migration.data.author));
                });
            })

            // Обработка исключений в миграции
            .catch((e) => {
                Log.error('Ошибка при выполнении миграции %d "%s": \n', migration.data.id, migration.data.name, e);
                throw e;
            });
    }

    function validateMigration(migration) {
        if (!_.isObject(migration.data) || !_.isFunction(migration.action)) {
            throw new Error('Миграция должна экспортировать данные "data" и функцию "action"');
        }
    }
})();