(function() {
    'use strict';

    module.exports.parseUrl = parseUrl;
    module.exports.updateLastActive = updateLastActive;
    module.exports.parseServerVersion = parseServerVersion;

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

    function parseServerVersion(versionStr) {
        var versionParts = (versionStr || '').split('.');
        return {
            major: versionParts.length > 0 ? versionParts[0] || 0 : 0,
            minor: versionParts.length > 1 ? versionParts[1] || 0 : 0,
            patch: versionParts.length > 2 ? versionParts[2] || 0 : 0
        };
    }
})();