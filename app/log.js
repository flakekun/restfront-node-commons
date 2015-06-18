(function () {
    'use strict';

    var fs = require('fs');
    var moment = require('moment');
    var winston = require('winston');
    var expressWinston = require('express-winston');

    module.exports = {
        // Инициализация системы логов
        init: function (logPath, filePrefix) {
            _logPath = (logPath) ? logPath + '/' : './';
            _logFilePrefix = filePrefix || 'app';

            preparePath();
            setupAppLog();
        },

        // Настройка лога запросов
        createRequestLog: function () {
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
    };

    // Расширяем exports объект методами из winston
    winston.extend(module.exports);

    var _logPath = '',
        _logFilePrefix = 'app';

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
        // Удаляем текущие логи
        winston.remove('console');
        winston.remove('app-daily-console');
        winston.remove('app-daily-file');

        // Лог в консоль
        winston.add(winston.transports.Console, {
            name: 'app-daily-console',
            level: 'info',
            handleExceptions: true,
            formatter: appFormatter
        });

        // Лог в файл
        winston.add(winston.transports.DailyRotateFile, {
            name: 'app-daily-file',
            filename: _logPath + _logFilePrefix,
            datePattern: '_yyyy-MM-dd.log',
            level: 'info',
            handleExceptions: true,
            json: false,
            formatter: appFormatter
        });
    }


    function appFormatter(options) {
        return options.level.toUpperCase() + ' [' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + (undefined !== options.message ? options.message : '');
    }

    function requestFormatter(options) {
        return '[' + moment().format('YYYY-MM-DD HH:mm:ss') + '] ' + (undefined !== options.message ? options.message : '');
    }
})();