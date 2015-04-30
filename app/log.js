(function () {
    'use strict';

    var fs = require('fs');
    var moment = require('moment');

    // TODO: как-то разруливать отсутствие winston в использующем проекте
    try {
        var winston = require('winston');
        var expressWinston = require('express-winston');
    } catch (e) {}

    // Public объект
    module.exports = {
        init: init,
        createRequestLog: createRequestLog
    };

    // Расширяем его методами из winston
    if (winston) {
        winston.extend(module.exports);
    }

    var _logPath = '';

    function init(logPath) {
        _logPath = (logPath) ? logPath + '/' : './';

        preparePath();
        setupAppLog();
    }

    function preparePath() {
        try {
            fs.mkdirSync(_logPath);
        } catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }
    }

    // Настройка лога приложения
    function setupAppLog() {
        // Удаляем лог в консоль по умолчанию
        winston.remove('console');

        // Лог в файл
        winston.add(winston.transports.Console, {
            name: 'app-daily-console',
            level: 'info',
            handleExceptions: true,
            formatter: appFormatter
        });

        // Лог в консоль
        winston.add(winston.transports.DailyRotateFile, {
            name: 'app-daily',
            filename: _logPath + 'app',
            datePattern: '_yyyy-MM-dd.log',
            level: 'info',
            handleExceptions: true,
            json: false,
            formatter: appFormatter
        });
    }

    // Настройка лога запросов
    function createRequestLog() {
        return expressWinston.logger({
            transports: [
                new winston.transports.DailyRotateFile({
                    name: 'request-daily',
                    filename: _logPath + 'request',
                    datePattern: '_yyyy-MM-dd.log',
                    level: 'info',
                    handleExceptions: true,
                    json: false,
                    formatter: requestFormatter
                })
            ],
            msg: '{{res.statusCode}} {{req.method}} "{{req.url}}" - {{res._headers["content-length"]}} - {{res.responseTime}} ms',
            meta: false,
            statusLevels: true
        });
    }

    function appFormatter(options) {
        return options.level.toUpperCase() + ' [' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + (undefined !== options.message ? options.message : '');
    }

    function requestFormatter(options) {
        return '[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + (undefined !== options.message ? options.message : '');
    }
})();