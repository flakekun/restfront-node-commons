(function () {
    'use strict';

    var bcrypt = require('bcrypt');
    var jwt = require('jsonwebtoken');
    var expressJwt = require('express-jwt');
    var q = require('q');

    var log = require('..').log;

    /**
     * Хеширование пароля
     * @param {string} password Пароль
     * @promise {string} Хеш пароля
     */
    exports.hashPassword = hashPassword;

    /**
     * Проверка валидности пароля при сверке с хешем
     * @param {string} password  Пароль
     * @param {string} hash      Хеш пароля
     * @promise {boolean} Валиден ли пароль
     */
    exports.validatePassword = validatePassword;

    /**
     * Создать express middleware для проверки Basic HTTP аутентификации
     * @param userStore Хранилище пользователей
     * @returns {Function} express middleware
     */
    exports.createBasicAuthenticator = createBasicAuthenticator;

    /**
     * Создать аутентификатор для проверки аутентификации на основе jwt-токена
     * @param userStore   Хранилище пользователей
     * @param privateKey  Секретный ключ для генерации jwt-токенов
     * @returns {Object}
     */
    exports.createTokenAuthenticator = createTokenAuthenticator;

    function hashPassword(password) {
        var deferred = q.defer();

        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) {
                    deferred.reject(err);
                }

                deferred.resolve(hash);
            });
        });

        return deferred.promise;
    }

    function validatePassword(password, hash) {
        var deferred = q.defer();

        bcrypt.compare(password, hash, function (err, res) {
            if (err) {
                deferred.reject(err);
            }

            deferred.resolve(res);
        });

        return deferred.promise;
    }

    function createBasicAuthenticator(userStore) {
        if (!userStore || !userStore.getUserByLogin) {
            log.warn('Хранилище пользователей не указано или не поддерживает метод getUserByLogin - аутентификация не проверяется');
        }

        return function (req, res, next) {
            // Пропускаем аутентификацию, если что-то не то с хранилищем пользователей
            if (!userStore || !userStore.getUserByLogin) {
                next();
                return;
            }

            // Парсим заголовок аутентификации
            var authData = parseBasicAuthData(req);

            if (authData) {
                // Запрашиваем пользователя по логину у хранилища пользователей
                userStore.getUserByLogin(authData.login)
                    .then(function (user) {
                        if (!user) {
                            return q.reject();
                        }

                        // Если нашли пользователя, то проверяем пароль
                        return validatePassword(authData.password, user.password).then(function (passwordValid) {
                            // Если пароль верен, то запоминаем пользователя и разрешаем переход к следующему ресурсу
                            if (passwordValid) {
                                req.user = user;
                                next();
                            } else {
                                // .. иначе отвечаем 401
                                sendUnauthorized(res);
                            }
                        });
                    })
                    .catch(function () {
                        sendUnauthorized(res);
                    })
                    .done();
            } else {
                // Если не смогли разобрать заголовок аутентификации, то отвечаем 401
                sendUnauthorized(res);
            }
        };
    }

    function createTokenAuthenticator(userStore, privateKey) {
        if (!userStore || !userStore.getUserByLogin) {
            log.warn('Хранилище пользователей не указано или не поддерживает метод getUserByLogin - аутентификация не проверяется');
        }

        var _privateKey = privateKey;

        return {
            middleware: function (req, res, next) {

            },
            loginEndpoint: function (req, res, next) {

            }
        };
    }

    /**
     * Парсинг данных Basic HTTP аутентификации из заголовка запроса
     * @param req Запрос
     * @returns {Object | null} Данные аутентификации
     */
    function parseBasicAuthData(req) {
        var auth = req.headers.authorization;
        if (!auth) {
            return;
        }

        // malformed
        var parts = auth.split(' ');
        if ('basic' !== parts[0].toLowerCase()) {
            return;
        }
        if (!parts[1]) {
            return;
        }
        auth = parts[1];

        // credentials
        auth = new Buffer(auth, 'base64').toString();
        auth = auth.match(/^([^:]*):(.*)$/);
        if (!auth) {
            return;
        }

        return {login: auth[1], password: auth[2]};
    }

    function parseTokenAuthData(req) {
        var auth = req.headers.authorization;
        if (!auth) {
            return;
        }

        var parts = auth.split(' ');
        if (parts.length === 2) {
            var scheme = parts[0];
            var token = parts[1];

            if (/^Bearer$/i.test(scheme)) {
                return token;
            }
        }
    }

    function sendUnauthorized(res) {
        res
            .status(401)
            .set('WWW-Authenticate', 'Basic realm="Restfront Delivery"')
            .send('Unauthorized');
    }

    /**
     * Исключение бросаемое при ошибке аутентификации
     * @param code
     * @param error
     * @constructor
     */
    function UnauthorizedError(code, error) {
        Error.call(this, error.message);
        Error.captureStackTrace(this, this.constructor);
        this.name = "UnauthorizedError";
        this.message = error.message;
        this.code = code;
        this.status = 401;
        this.inner = error;
    }

    UnauthorizedError.prototype = Object.create(Error.prototype);
    UnauthorizedError.prototype.constructor = UnauthorizedError;
})();