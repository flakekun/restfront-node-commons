(function () {
    'use strict';

    const fs = require('fs');
    const util = require('util');
    const moment = require('moment');
    const winston = require('winston');
    const WinstonDailyRotateFile = require('winston-daily-rotate-file');
    const morgan = require('morgan');
    const cluster = require('cluster');

    // Названия транспортов
    const
        LOGGER_APP_CONSOLE = 'app-console',
        LOGGER_APP_FILE = 'app-daily-file',
        LOGGER_REQUEST_CONSOLE = 'request-console',
        LOGGER_REQUEST_FILE = 'request-daily-file';

    // Настройки файлового лога
    let _logPath = '',
        _logFilePrefix = 'app';

    // winston логгер
    const winstonLogger = new (winston.Logger)({
        exitOnError: true,

        transports: [
            new (winston.transports.Console)({
                name: LOGGER_APP_CONSOLE,
                level: 'info',
                formatter: appFormatter,
                handleExceptions: true,
                humanReadableUnhandledException: true
            })
        ]
    });

    // Экспортируемые методы логгера
    module.exports = {
        /**
         * Инициализация файлового лога
         *
         * @param {String} logPath          Путь к папке логов
         * @param {String} [filePrefix=app] Префикс файлов лога
         */
        initFileLog,
        init: initFileLog,

        /**
         * Настройка лога запросов
         * @returns {morgan}
         */
        createRequestLog,

        /**
         * Создать функтор из метода logAndRethrow
         *
         * @param {String} caption Заголовок сообщения об ошибке
         * @returns {function} Функтор
         */
        createLogAndRethrow,

        /**
         * Записать в лог сообщение об ошибке и перебросить исключение
         *
         * @param {String} caption Заголовок сообщения об ошибке
         * @param error Ошибка
         */
        logAndRethrow,

        /**
         * Записать в лог сообщение об ошибке, только если передана ошибка
         *
         * @param [error] Ошибка
         */
        logIfError
    };

    // Проксируем вызовы функций лога на winston логгер
    ['silly', 'debug', 'verbose', 'info', 'warn', 'error'].forEach((method) => {
        module.exports[method] = function () {
            return winstonLogger[method].apply(winstonLogger, arguments);
        };
    });

    /**
     * Инициализация файлового лога
     *
     * @param {String} logPath          Путь к папке логов
     * @param {String} [filePrefix=app] Префикс файлов лога
     */
    function initFileLog(logPath, filePrefix) {
        _logPath = (logPath) ? logPath + '/' : './';
        _logFilePrefix = filePrefix || 'app';

        preparePath(_logPath);

        // Удаляем текущий транспорт
        if (winstonLogger.transports[LOGGER_APP_FILE]) {
            winstonLogger.remove(LOGGER_APP_FILE);
        }

        // Лог в файл
        winstonLogger.add(WinstonDailyRotateFile, {
            name: LOGGER_APP_FILE,
            level: 'info',
            filename: _logPath + _logFilePrefix,
            datePattern: '_yyyy-MM-dd.log',
            localTime: true,
            json: false,
            formatter: appFormatter,
            handleExceptions: true,
            humanReadableUnhandledException: true
        });
    }

    /**
     * Настройка лога запросов
     * @returns {morgan}
     */
    function createRequestLog() {
        const requestLogger = new winston.Logger({
            level: 'info',

            transports: [
                // Лог в консоль
                new (winston.transports.Console)({
                    name: LOGGER_REQUEST_CONSOLE,
                    formatter: requestFormatter
                }),
                // Лог в файл
                new WinstonDailyRotateFile({
                    name: LOGGER_REQUEST_FILE,
                    filename: _logPath + 'request',
                    datePattern: '_yyyy-MM-dd.log',
                    json: false,
                    formatter: requestFormatter
                })
            ]
        });

        // Настраиваем morgan для использования winston лога
        const format = ':remote-addr ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time';
        return morgan(format, {
            stream: {
                write: function (message, encoding) {
                    requestLogger.info((message || '').trim());
                }
            }
        });
    }

    /**
     * Создать функтор из метода logAndRethrow
     *
     * @param {String} caption Заголовок сообщения об ошибке
     * @returns {function} Функтор
     */
    function createLogAndRethrow(caption) {
        return function (e) {
            logAndRethrow(caption, e);
        };
    }

    /**
     * Записать в лог сообщение об ошибке и перебросить исключение
     *
     * @param {String} caption Заголовок сообщения об ошибке
     * @param error Ошибка
     */
    function logAndRethrow(caption, error) {
        const message = prepareErrorMessage(error);
        winstonLogger.error('%s: %s', caption, message);
        throw error;
    }

    /**
     * Записать в лог сообщение об ошибке, только если передана ошибка
     *
     * @param [error] Ошибка
     */
    function logIfError(error) {
        if (error) {
            winstonLogger.error(prepareErrorMessage(error));
        }
    }

    function prepareErrorMessage(error) {
        let message = '';
        if (error) {
            message = message + error;
            const stack = error.stack;
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

    function appFormatter(options) {
        let output = options.level.toUpperCase() + ' [' + formattedTimestamp() + '] ' + workerMark() + (options.message || '');

        const meta = options.meta;
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
        return '[' + formattedTimestamp() + '] ' + (options.message || '');
    }

    function formattedTimestamp() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    function workerMark() {
        if (!cluster.isWorker) {
            return '';
        }

        return '[pid: ' + cluster.worker.process.pid + ', id: ' + cluster.worker.id + '] ';
    }
})();