(function() {
    'use strict';

    var Q = require('q');

    module.exports.parseUrl = parseUrl;
    module.exports.query = query;
    module.exports.updateLastActive = updateLastActive;

    /**
     * Разбор строки пути к БД
     *
     * @param url Путь к БД
     * @returns {*}
     */
    function parseUrl(url) {
        if (!url) {
            return;
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

    /**
     * Выполнить запрос на указанной транзакции
     * @param transactionWrapper Транзакция
     * @param sql         Текст запроса
     * @param params      Массив параметров запроса
     * @promise {data}
     */
    function query(transactionWrapper, sql, params) {
        return Q.Promise(function (resolve, reject) {
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
     * Обновить время последней активности на соединении
     * @param {Connection} connection Соединение
     */
    function updateLastActive(connection) {
        connection.lastActive = Date.now();
    }
})();