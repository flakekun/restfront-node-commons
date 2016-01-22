(function() {
    'use strict';

    var _ = require('lodash');

    module.exports = new DataUtils();

    function DataUtils() {}

    /**
     * Получить значение свойства из объекта, без учета чувствительности к регистру,
     * с возможностью указания нескольких названий свойства и значения по умолчанию.
     *
     * @param {Object}               object         Объект
     * @param {Array<String>|String} propNames      Название свойства, или массив названий
     * @param {*}                    [defaultValue] Значение по умолчанию
     * @returns {*} Значение свойства
     */
    DataUtils.prototype.get = function(object, propNames, defaultValue) {
        if (Array.isArray(propNames)) {
            for (var i = 0; i < propNames.length; i++) {
                var propName = propNames[i];
                if (object[propName] != null) {
                    return object[propName];
                }

                propName = propName.toLowerCase();
                if (object[propName] != null) {
                    return object[propName];
                }
            }
        } else if (_.isString(propNames)) {
            if (object[propNames] != null) {
                return object[propNames];
            }
            if (object[propNames.toLowerCase()] != null) {
                return object[propNames.toLowerCase()];
            }
        }

        return defaultValue;
    };

    /**
     * Создать функцию-преобразователь результата БД запроса для получения массива объектов
     *
     * @param {Function} [Constructor] Функция-конструктор
     * @returns {Function<Array>}
     */
    DataUtils.prototype.prepareArrayMapper = function (Constructor) {
        return function (result) {
            if (Array.isArray(result)) {
                return result.map(function (data) {
                    return Constructor ? new Constructor(data) : data;
                });
            }
        };
    };

    /**
     * Создать функцию-преобразователь результата БД запроса для получения одного объекта
     *
     * @param {Function} [Constructor] Функция-конструктор
     * @returns {Function<Object>}
     */
    DataUtils.prototype.prepareObjectMapper = function (Constructor) {
        return function (result) {
            if (result && result.length > 0) {
                return Constructor ? new Constructor(result[0]) : result[0];
            }
        };
    };

    /**
     * Подходит ли значение под ключ в БД
     *
     * @param {number} value Значение
     * @returns {boolean}
     */
    DataUtils.prototype.isValidKey = function (value) {
        return value > 0;
    };

    /**
     * Возвращаем ключ, если он валиден, иначе null
     *
     * @param {number} value Значение
     * @returns {Number|null}
     */
    DataUtils.prototype.validKeyOrNull = function (value) {
        return this.isValidKey(value) ? value : null;
    };


    /**
     * Парсинг ключа БД из строки
     *
     * @param {number} value Значение
     * @returns {number}
     */
    DataUtils.prototype.parseKey = function (value) {
        value = Number(value);
        return this.isValidKey(value) ? value : -1;
    };

    /**
     * Подготовка массива ключей: преобразование в числа, удаление дубликатов, удаление не ключей
     *
     * @param {Array} array Массив необработанных данных
     * @returns {Array<number>} Массив ключей
     */
    DataUtils.prototype.filterKeys = function (array) {
        var self = this;

        if (!Array.isArray(array)) {
            throw new Error('Not an array');
        }

        // Преобразование и фильтрация
        array = array
            .map(function (element) {
                return Number(element);
            })
            .filter(function (element) {
                return self.isValidKey(element);
            });

        // Удаление дубликатов
        array = _.uniq(array);

        return array;
    };
})();
