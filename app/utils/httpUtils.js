(function () {
    'use strict';

    var _ = require('lodash');
    var HTTPStatus = require('http-status');
    var Log = require('../log');

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
            .status(HTTPStatus.OK)
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
        var status = (error && error.status) ? error.status : HTTPStatus.INTERNAL_SERVER_ERROR;
        var name = (error && error.name) ? error.name : HTTPStatus[HTTPStatus.INTERNAL_SERVER_ERROR];
        var message = (error) ? error.message || error : '';

        // Запишем предупреждение в лог приложения
        Log.warn(message);

        // Отвечаем клиенту с кодом 'status'
        res.status(status);

        // Для 401 ставим заголовок
        if (status === HTTPStatus.UNAUTHORIZED) {
            res.set('WWW-Authenticate', 'Basic realm="RestFront"');
        }

        // Тело ответа
        res.json({
            status: status,
            error: name,
            message: message
        });
    };

    HttpUtils.prototype.respondUnauthorized = function (res, message) {
        res
            .status(HTTPStatus.UNAUTHORIZED)
            .set('WWW-Authenticate', 'Basic realm="RestFront"')
            .json({
                status: HTTPStatus.UNAUTHORIZED,
                error: HTTPStatus[HTTPStatus.UNAUTHORIZED],
                message: message || ''
            });
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