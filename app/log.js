(function () {
    'use strict';

    var fs = require('fs');
    var util = require('util');
    var moment = require('moment');
    var winston = require('winston');
    var winstonDailyRotateFile = require('winston-daily-rotate-file');
    var morgan = require('morgan');

    var log = new Log();

    var methods = [
        'silly',
        'debug',
        'verbose',
        'info',
        'warn',
        'error'
    ];
    methods.forEach(function (method) {
        log[method] = function () {
            return log.logger[method].apply(log.logger, arguments);
        };
    });

    module.exports = log;

    var _logPath = '',
        _logFilePrefix = 'app';

    /**
     *
     * @constructor
     * @augments winston
     */
    function Log() {
        this.logger = new (winston.Logger)({
            transports: []
        });

        setupAppConsoleLog(this.logger);
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

        preparePath(_logPath);
        setupAppFileLog(this.logger);
    };

    /**
     * Настройка лога запросов
     * @returns {morgan}
     */
    Log.prototype.createRequestLog = function () {
        var logger = new winston.Logger();
        setupRequestLog(logger);

        var format = ':remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time';
        return morgan(format, {
            stream: {
                write: function(message, encoding) {
                    logger.info((message || '').trim());
                }
            }
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
     * Записать в лог сообщение об ошибке и перебросить исключение
     *
     * @param {String} caption Заголовок сообщения об ошибке
     * @param e Ошибка
     */
    Log.prototype.logAndRethrow = function (caption, e) {
        var message = prepareErrorMessage(e);
        this.error('%s: %s', caption, message);
        throw e;
    };

    /**
     * Записать в лог сообщение об ошибке, только если передана ошибка
     *
     * @param [e] Ошибка
     */
    Log.prototype.logIfError = function (e) {
        if (e) {
            this.error(prepareErrorMessage(e));
        }
    };

    function prepareErrorMessage(e) {
        var message = '';
        if (e) {
            message = message + e;
            var stack = e.stack;
            if (stack) {
                message = message + '\n' + stack;
            }
        }

        return message;
    }

    function preparePath(path) {
        try {
            fs.mkdirSync(path);
        } catch (e) {
            if (e.code !== 'EEXIST') {
                throw e;
            }
        }
    }

    /**
     * Лог в консоль
     */
    function setupAppConsoleLog(logger) {
        var loggerName = 'app-daily-console';

        // Удаляем текущий транспорт
        if (logger.transports[loggerName]) {
            logger.remove(loggerName);
        }

        logger.add(winston.transports.Console, {
            name: loggerName,
            level: 'info',
            handleExceptions: true,
            formatter: appFormatter
        });
    }

    /**
     * Лог в файл
     */
    function setupAppFileLog(logger) {
        var loggerName = 'app-daily-file';

        // Удаляем текущий транспорт
        if (logger.transports[loggerName]) {
            logger.remove(loggerName);
        }

        // Лог в файл
        logger.add(winstonDailyRotateFile, {
            name: loggerName,
            filename: _logPath + _logFilePrefix,
            datePattern: '_yyyy-MM-dd.log',
            level: 'info',
            handleExceptions: true,
            json: false,
            formatter: appFormatter
        });
    }

    /**
     * Лог запросов в файл
     */
    function setupRequestLog(logger) {
        logger.add(winston.transports.Console, {
            name: 'request-console',
            level: 'info',
            handleExceptions: true,
            formatter: requestFormatter
        });

        // Лог в файл
        logger.add(winstonDailyRotateFile, {
            name: 'request-daily-file',
            filename: _logPath + 'request',
            datePattern: '_yyyy-MM-dd.log',
            level: 'info',
            json: false,
            formatter: requestFormatter
        });
    }

    function appFormatter(options) {
        var output = options.level.toUpperCase() + ' ';
        output += timestamp() + ' ';
        output += (options.message || '');

        var meta = options.meta;
        if (meta && Object.keys(meta).length > 0) {
            if (Array.isArray(meta.stack)) {
                output += '\n' + meta.stack.join('\n');
            } else {
                output += '\n' + util.inspect(meta);
            }
        }

        return output;
    }

    function requestFormatter(options) {
        return timestamp() + ' ' + (options.message || '');
    }

    function timestamp() {
        return '[' + moment().format('YYYY-MM-DD HH:mm:ss') + ']';
    }
})();