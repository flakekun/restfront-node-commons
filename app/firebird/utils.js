(function() {
    'use strict';

    module.exports.parseUrl = parseUrl;
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
     * Обновить время последней активности на соединении
     * @param {Connection} connection Соединение
     */
    function updateLastActive(connection) {
        connection.lastActive = Date.now();
    }
})();