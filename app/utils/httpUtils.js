(function () {
    'use strict';

    const _ = require('lodash');
    const HTTPStatus = require('http-status');

    const Log = require('../log');

    module.exports = {
        respondSuccess,
        respondError,
        respondUnauthorized,

        createSuccessResponse,
        createErrorResponse
    };

    /**
     * Закончить http запрос успешным ответом
     *
     * @param res  {ServerResponse} HTTP ответ
     * @param data {Object|Array}   Данные для ответа
     */
    function respondSuccess(res, data) {
        // Подготовим данные к ответу на клиент
        prepareForResponse(data);

        res
            .status(HTTPStatus.OK)
            .json(data);
    }

    /**
     * Закончить http запрос ошибочным ответом
     *
     * @param res   {ServerResponse} HTTP ответ
     * @param error {Error|String}   Ошибка
     */
    function respondError(res, error) {
        // Определяем данные ошибки
        const status = (error && error.status) ? error.status : HTTPStatus.INTERNAL_SERVER_ERROR;
        const name = (error && error.name) ? error.name : HTTPStatus[HTTPStatus.INTERNAL_SERVER_ERROR];
        const message = (error) ? error.message || error : '';

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
    }

    function respondUnauthorized(res, message) {
        res
            .status(HTTPStatus.UNAUTHORIZED)
            .set('WWW-Authenticate', 'Basic realm="RestFront"')
            .json({
                status: HTTPStatus.UNAUTHORIZED,
                error: HTTPStatus[HTTPStatus.UNAUTHORIZED],
                message: message || ''
            });
    }

    function createSuccessResponse(res, actualResult) {
        return function (result) {
            if (actualResult) {
                result = actualResult;
            }
            respondSuccess(res, result);
        };
    }

    function createErrorResponse(res) {
        return function (error) {
            respondError(res, error);
        };
    }

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
                _.invokeMap(data, 'prepareForResponse');
            } else if (data.prepareForResponse) {
                data.prepareForResponse();
            }
        }

        return data;
    }
})();