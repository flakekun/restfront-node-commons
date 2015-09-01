(function() {
    'use strict';

    var FBDriver = require('node-firebird');
    var Pool = require('./pool');
    var Connection = require('./connection');
    var utils = require('./utils');

    module.exports = new FB();

    /**
     *
     * @constructor
     */
    function FB() { }

    /**
     * Создать пул соединений к БД
     *
     * @param {Number} maxConnections Максимальное кол-во соединений у пуле
     * @param {String} url            Строка подключения к БД
     * @param {String} user           Пользователь
     * @param {String} password       Пароль
     * @returns {Pool}
     */
    FB.prototype.createPool = function(maxConnections, url, user, password) {
        return new Pool(maxConnections, url, user, password);
    };

    /**
     * Создать подключение к БД
     *
     * @param url       Путь к БД
     * @param user      Пользователь
     * @param password  Пароль
     * @returns {Connection}
     */
    FB.prototype.createConnection = function (url, user, password) {
        return new Connection(url, user, password);
    };

    FB.prototype.parseUrl = utils.parseUrl;

    FB.prototype.escape = FBDriver.escape;

})();