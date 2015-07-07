(function () {
    'use strict';

    var _ = require('underscore');

    var log = require('../log');

    module.exports = new HttpUtils();

    function HttpUtils() {}

    /**
     * Закончить http запрос успешным ответом
     *
     * @param res  {ServerResponse} HTTP ответ
     * @param data {Object|Array}   Данные для ответа
     */
    HttpUtils.prototype.respondSuccess = function (res, data) {
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
    HttpUtils.prototype.respondError = function (res, error) {
        // Определяем данные ошибки
        var status = (error && error.status) ? error.status : 500;
        var name = (error && error.name) ? error.name : 'Server Error';
        var message = (error) ? error.message || error : '';

        // Запишем предупреждение в лог приложения
        log.warn(message);

        var body = {
            status: status,
            error: name,
            message: message
        };

        // Отвечаем клиенту с кодом 'status'
        res
            .status(status)
            .json(body);
    };

    HttpUtils.prototype.respondUnauthorized = function (res, message) {
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

    HttpUtils.prototype.createSuccessResponse = function (res, actualResult) {
        return function (result) {
            if (actualResult) {
                result = actualResult;
            }
            this.respondSuccess(res, result);
        }.bind(this);
    };

    HttpUtils.prototype.createErrorResponse = function (res) {
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