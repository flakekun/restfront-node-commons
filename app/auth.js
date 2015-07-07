(function () {
    'use strict';

    var bcrypt = require('bcrypt');
    var jwt = require('jsonwebtoken');
    var expressJwt = require('express-jwt');
    var Q = require('q');

    var Log = require('./log');
    var HttpUtils = require('./utils/httpUtils');

    module.exports = new Auth();

    function Auth() {}

    /**
     * Хеширование пароля
     * @param {string} password Пароль
     * @promise {string} Хеш пароля
     */
    Auth.prototype.hashPassword = function (password) {
        // Возвращаем результат через обещание
        return Q.Promise(function (resolve, reject) {
            // Генерация соли
            bcrypt.genSalt(10, function (err, salt) {
                // Хеширование пароля
                bcrypt.hash(password, salt, function (err, hash) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(hash);
                });
            });
        });
    };

    /**
     * Проверка валидности пароля при сверке с хешем
     * @param {string} password  Пароль
     * @param {string} hash      Хеш пароля
     * @promise {boolean} Валиден ли пароль
     */
    Auth.prototype.validatePassword = function (password, hash) {
        // Возвращаем результат через обещание
        return Q.Promise(function (resolve, reject) {
            bcrypt.compare(password, hash, function (err, res) {
                if (err) {
                    return reject(err);
                }

                resolve(res);
            });
        });
    };

    /**
     * Создать express middleware для проверки Basic HTTP аутентификации
     *
     * @param userStore Хранилище пользователей
     * @returns {Function} express middleware
     */
    Auth.prototype.createBasicAuthenticator = function (userStore) {
        var self = this;

        if (!userStore || !userStore.getUserByLogin) {
            Log.warn('Хранилище пользователей не указано или не поддерживает метод getUserByLogin - аутентификация не проверяется');
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
                            return Q.reject();
                        }

                        // Если нашли пользователя, то проверяем пароль
                        return self.validatePassword(authData.password, user.password).then(function (passwordValid) {
                            // Если пароль верен, то запоминаем пользователя и разрешаем переход к следующему ресурсу
                            if (passwordValid) {
                                req.user = user;
                                next();
                            } else {
                                // .. иначе отвечаем 401
                                HttpUtils.respondUnauthorized(res);
                            }
                        });
                    })
                    .catch(function () {
                        HttpUtils.respondUnauthorized(res);
                    })
                    .done();
            } else {
                // Если не смогли разобрать заголовок аутентификации, то отвечаем 401
                HttpUtils.respondUnauthorized(res);
            }
        };
    };

    /**
     * Создать аутентификатор для проверки аутентификации на основе jwt-токена
     *
     * @param privateKey      {String}   Секретный ключ для генерации jwt-токенов
     * @param getUserCallback {Function} Функция для получения пользователя по паролю
     * @returns {Object}
     */
    Auth.prototype.createTokenAuthenticator = function (privateKey, getUserCallback) {
        var self = this;

        if (!getUserCallback) {
            Log.warn('Не указан метод для получения пользователей - аутентификация не работает');
        }

        // Express middleware
        var jwtMiddleware = expressJwt({secret: privateKey});

        return {
            /**
             * Express middleware для проверки и декодинга jwt токенов
             */
            middleware: jwtMiddleware,

            /**
             * Express middleware для логина и генерации jwt токена
             */
            loginEndpoint: function (req, res) {
                var login, password;

                // Из тела запроса берем данные логина
                if (req.body) {
                    login = req.body.login;
                    password = req.body.password;
                }

                // Если не указаны данные логина - поругаемся
                if (!login || !password) {
                    return HttpUtils.respondUnauthorized(res);
                }

                // Запрашиваем пользователя по логину у хранилища пользователей
                getUserCallback(login)
                    .then(function (user) {
                        if (!user) {
                            return HttpUtils.respondUnauthorized(res);
                        }

                        // Если нашли пользователя, то проверяем пароль
                        return self.validatePassword(password, user.password)
                            .then(function (passwordValid) {
                                // Если пароль верен, то ответим клиенту сгенерированным токеном
                                if (passwordValid) {
                                    // Храним ID и NAME пользователя в токене
                                    var jwtPayload = {
                                        id: user.id,
                                        login: user.login
                                    };

                                    // Тело http ответа
                                    var body = {
                                        token: jwt.sign(jwtPayload, privateKey)
                                    };

                                    // Ответим клиенту
                                    HttpUtils.respondSuccess(res, body);
                                } else {
                                    // .. иначе отвечаем 401
                                    HttpUtils.respondUnauthorized(res);
                                }
                            });
                    })
                    .catch(function () {
                        HttpUtils.respondUnauthorized(res);
                    })
                    .done();
            }
        };
    };

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
})();