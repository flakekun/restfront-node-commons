(function () {
    'use strict';

    var fs = require('fs');
    var moment = require('moment');
    var winston = require('winston');
    var expressWinston = require('express-winston');

    module.exports = new Log();

    var _logPath = '',
        _logFilePrefix = 'app';

    /**
     *
     * @constructor
     * @augments winston
     */
    function Log() {
        // Расширяем объект методами из winston
        winston.extend(this);
    }

    /**
     * Инициализация системы логов
     *
     * @param {String} logPath          Путь к папке логов
     * @param {String} [filePrefix=app] Префикс файлов лога
     */
    Log.prototype.init = function (logPath, filePrefix) {
        _logPath = (logPath) ? logPath + '/' : './';
        _logFilePrefix = filePrefix || 'app';

        preparePath();
        setupAppLog();
    };

    /**
     * Настройка лога запросов
     * @returns {expressWinston.logger}
     */
    Log.prototype.createRequestLog = function () {
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
    };

    /**
     * Создать функтор из метода Log.logAndRethrow
     *
     * @param {String} caption Заголовок сообщения об ошибке
     * @returns {function(this:Log)} Функтор
     */
    Log.prototype.createLogAndRethrow = function (caption) {
        return function (e) {
            this.logAndRethrow(caption, e);
        }.bind(this);
    };

    /**
     * Записать в лог сообщение об ошибке, только если передана ошибка
     *
     * @param [e] Ошибка
     */
    Log.prototype.logIfError = function (e) {
        if (e) {
            this.error(e.stack || e.message || e);
        }
    };

    /**
     * Записать в лог сообщение об ошибке и перебросить исключение
     *
     * @param {String} caption Заголовок сообщения об ошибке
     * @param e Ошибка
     */
    Log.prototype.logAndRethrow = function (caption, e) {
        var message = e ? e.stack || e.message || e : '';
        this.error('%s: %s', caption, message);
        throw e;
    };

    function preparePath() {
        try {
            fs.mkdirSync(_logPath);
        } catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }
    }

    /**
     * Настройка лога приложения
     */
    function setupAppLog() {
        // Удаляем текущие транспорты
        winston.clear();

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