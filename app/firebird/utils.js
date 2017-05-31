(function() {
    'use strict';

    module.exports = {
        parseUrl,
        parseServerVersion
    };

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

        const result = {
            host: '',
            port: '',
            database: ''
        };

        let hostNameEndIndex, portEndIndex;
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

    function parseServerVersion(versionStr) {
        const versionParts = (versionStr || '').split('.');
        return {
            major: versionParts.length > 0 ? versionParts[0] || 0 : 0,
            minor: versionParts.length > 1 ? versionParts[1] || 0 : 0,
            patch: versionParts.length > 2 ? versionParts[2] || 0 : 0
        };
    }
})();