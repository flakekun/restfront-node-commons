(function () {
    'use strict';

    const jwt = require('jsonwebtoken');
    const expressJwt = require('express-jwt');
    const Promise = require('bluebird');

    const Log = require('./log');
    const HttpUtils = require('./utils/httpUtils');

    module.exports = {
        hashPassword,
        validatePassword,

        createBasicAuthenticator,
        createTokenAuthenticator
    };

    /**
     * Хеширование пароля
     * @param {string} password Пароль
     * @promise {string} Хеш пароля
     */
    function hashPassword(password) {
        let bcrypt;
        try {
            bcrypt = require('bcrypt');
        } catch (e) {
        }
        if (!bcrypt) {
            return Promise.reject(new Error('Необходимо установить модуль bcrypt'));
        }

        // Возвращаем результат через обещание
        return new Promise((resolve, reject) => {
            // Генерация соли
            bcrypt.genSalt(10, (err, salt) => {
                // Хеширование пароля
                bcrypt.hash(password, salt, (err, hash) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(hash);
                });
            });
        });
    }

    /**
     * Проверка валидности пароля при сверке с хешем
     * @param {string} password  Пароль
     * @param {string} hash      Хеш пароля
     * @promise {boolean} Валиден ли пароль
     */
    function validatePassword(password, hash) {
        let bcrypt;
        try {
            bcrypt = require('bcrypt');
        } catch (e) {
        }
        if (!bcrypt) {
            return Promise.reject(new Error('Необходимо установить модуль bcrypt'));
        }

        // Возвращаем результат через обещание
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, hash, (err, res) => {
                if (err) {
                    return reject(err);
                }

                resolve(res);
            });
        });
    }

    /**
     * Создать express middleware для проверки Basic HTTP аутентификации
     *
     * @param getUserCallback {Function} Функция для получения пользователя по логину
     * @returns {Function} express middleware
     */
    function createBasicAuthenticator(getUserCallback) {
        if (!getUserCallback) {
            Log.warn('Не указан метод для получения пользователей - аутентификация не работает');
        }

        return function (req, res, next) {
            // Пропускаем аутентификацию, если что-то не то с хранилищем пользователей
            if (!getUserCallback) {
                next();
                return;
            }

            // Парсим заголовок аутентификации
            const authData = parseBasicAuthData(req);

            // Если не смогли разобрать заголовок аутентификации, то отвечаем 401
            if (!authData) {
                return HttpUtils.respondUnauthorized(res);
            }

            // Запрашиваем пользователя по логину у хранилища пользователей
            getUserCallback(authData.login)
                .then((user) => {
                    if (!user) {
                        return Promise.reject();
                    }

                    // Если нашли пользователя, то проверяем пароль
                    return validatePassword(authData.password, user.password)
                        .then((passwordValid) => {
                            // Если пароль не верен, то отвечаем 401
                            if (!passwordValid) {
                                return HttpUtils.respondUnauthorized(res);
                            }

                            // Иначе запоминаем пользователя и разрешаем переход к следующему ресурсу
                            req.user = user;
                            next();
                        });
                })
                .catch(() => {
                    HttpUtils.respondUnauthorized(res);
                })
                .done();

        };
    }

    /**
     * Создать аутентификатор для проверки аутентификации на основе jwt-токена
     *
     * @param privateKey      {String}   Секретный ключ для генерации jwt-токенов
     * @param getUserCallback {Function} Функция для получения пользователя по паролю
     * @returns {Object}
     */
    function createTokenAuthenticator(privateKey, getUserCallback) {
        if (!getUserCallback) {
            Log.warn('Не указан метод для получения пользователей - аутентификация не работает');
        }

        // Express middleware
        const jwtMiddleware = expressJwt({secret: privateKey});

        return {
            /**
             * Express middleware для проверки и декодинга jwt токенов
             */
            middleware: jwtMiddleware,

            /**
             * Express middleware для логина и генерации jwt токена
             */
            loginEndpoint: function (req, res) {
                if (!req.body) {
                    return HttpUtils.respondUnauthorized(res);
                }

                // Из тела запроса берем данные логина
                const login = req.body.login,
                    password = req.body.password;
                if (!login || !password) {
                    return HttpUtils.respondUnauthorized(res);
                }

                // Запрашиваем пользователя по логину у хранилища пользователей
                getUserCallback(login)
                    .then((user) => {
                        if (!user) {
                            return HttpUtils.respondUnauthorized(res);
                        }

                        // Если нашли пользователя, то проверяем пароль
                        return validatePassword(password, user.password)
                            .then((passwordValid) => {
                                // Если пароль не верен, то отвечаем 401
                                if (!passwordValid) {
                                    return HttpUtils.respondUnauthorized(res);
                                }

                                // Иначе ответим клиенту сгенерированным токеном

                                // Храним ID и NAME пользователя в токене
                                const jwtPayload = {
                                    id: user.id,
                                    login: user.login
                                };

                                // Тело http ответа
                                const body = {
                                    token: jwt.sign(jwtPayload, privateKey)
                                };

                                // Ответим клиенту
                                HttpUtils.respondSuccess(res, body);
                            });
                    })
                    .catch(() => {
                        HttpUtils.respondUnauthorized(res);
                    })
                    .done();
            }
        };
    }

    /**
     * Парсинг данных Basic HTTP аутентификации из заголовка запроса
     * @param req Запрос
     * @returns {Object | null} Данные аутентификации
     */
    function parseBasicAuthData(req) {
        const authorization = req.headers.authorization;
        if (!authorization) {
            return;
        }

        // malformed
        const parts = authorization.split(' ');
        if ('basic' !== parts[0].toLowerCase()) {
            return;
        }
        if (!parts[1]) {
            return;
        }

        // credentials
        const credentials = new Buffer(parts[1], 'base64').toString();
        const matchedCredentials = credentials.match(/^([^:]*):(.*)$/);
        if (!matchedCredentials) {
            return;
        }

        return {
            login: matchedCredentials[1],
            password: matchedCredentials[2]
        };
    }
})();