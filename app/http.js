(function () {
    'use strict';

    var _ = require('underscore');

    var log = require('./log');

    /**
     * Закончить http запрос успешным ответом
     *
     * @param res  {ServerResponse} HTTP ответ
     * @param data {Object|Array}   Данные для ответа
     */
    module.exports.respondSuccess = function (res, data) {
        // Подготовим данные к ответу на клиент
        prepareForResponse(data);

        res
            .status(200)
            .json(data);
    };

    /**
     * Закончить http запрос ошибочным ответом
     *
     * @param res   {ServerResponse} HTTP ответ
     * @param error {Error|String}   Ошибка
     */
    module.exports.respondError = function (res, error) {
        // Определяем текст ошибки
        var message = (error) ? error.message || error : '';

        // Запишем предупреждение в лог приложения
        log.warn(message);

        var body = {
            status: 500,
            error: 'Server Error',
            message: message
        };

        // Отвечаем клиенту с кодом 500
        res
            .status(500)
            .json(body);
    };

    module.exports.respondUnauthorized = function (res, message) {
        var body = {
            status: 401,
            error: 'Unauthorized',
            message: message || ''
        };

        res
            .status(401)
            .set('WWW-Authenticate', 'Basic realm="Restfront"')
            .json(body);
    };

    module.exports.createSuccessResponse = function (res, actualResult) {
        return function (result) {
            if (actualResult) {
                result = actualResult;
            }
            this.respondSuccess(res, result);
        }.bind(this);
    };

    module.exports.createErrorResponse = function (res) {
        return function (error) {
            this.respondError(res, error);
        }.bind(this);
    };

    /**
     * Для объекта данных или для каждого объекта из массива данных вызовем метод prepareForResponse,
     * чтобы подготовить данные к отсылке на клиент.
     *
     * @param data {Object|Array} Данные
     * @returns {Object|Array} Подготовленные данные
     */
    function prepareForResponse(data) {
        if (data) {
            if (Array.isArray(data)) {
                _.invoke(data, 'prepareForResponse');
            } else if (data.prepareForResponse) {
                data.prepareForResponse();
            }
        }

        return data;
    }
})();