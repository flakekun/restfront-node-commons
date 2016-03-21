(function() {
    'use strict';

    var Moment = require('moment');

    var DATE_FORMAT = 'YYYY-MM-DD',
        TIME_FORMAT = 'HH:mm:ss',
        DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

    module.exports = new MomentUtils();

    function MomentUtils() { }

    MomentUtils.prototype.now = function() {
        return new Moment();
    };

    /**
     * Форматировать дату в строку
     *
     * @param {Moment|Date|String} date     Дата
     * @param {String}             [format] Формат
     * @returns {String}
     */
    MomentUtils.prototype.formatDate = function (date, format) {
        if (!date) { return ''; }

        if (!Moment.isMoment(date)) {
            date = this.parseDate(date);
        }
        return date ? date.format(format ? format : DATE_FORMAT) : '';
    };

    /**
     * Форматировать время в строку
     *
     * @param {Moment|Date|String} time     Время
     * @param {String}             [format] Формат
     * @returns {String}
     */
    MomentUtils.prototype.formatTime = function (time, format) {
        if (!time) { return ''; }

        if (!Moment.isMoment(time)) {
            time = this.parseTime(time);
        }
        return time ? time.format(format ? format : TIME_FORMAT) : '';
    };

    /**
     * Форматировать дату и время в строку
     *
     * @param {Moment|Date|String} dateTime Дата и время
     * @param {String}             [format] Формат
     * @returns {String}
     */
    MomentUtils.prototype.formatDateTime = function (dateTime, format) {
        if (!dateTime) { return ''; }

        if (!Moment.isMoment(dateTime)) {
            dateTime = this.parseDateTime(dateTime);
        }
        return dateTime ? dateTime.format(format ? format : DATETIME_FORMAT) : '';
    };

    /**
     * Создать moment на основе переданной даты
     *
     * @param {Date} date Дата
     * @returns {Moment|undefined}
     */
    MomentUtils.prototype.fromDate = function (date) {
        if (date) {
            return Moment(date);
        }
    };

    /**
     * Парсинг даты
     *
     * @param {Date|String} dateStr  Дата
     * @param {String}      [format] Формат даты
     * @returns {Moment|undefined}
     */
    MomentUtils.prototype.parseDate = function (dateStr, format) {
        if (dateStr) {
            if (Moment.isDate(dateStr)) {
                return this.fromDate(dateStr);
            }
            return Moment(dateStr, format || DATE_FORMAT);
        }
    };

    /**
     * Парсинг времени
     *
     * @param {Date|String} timeStr  Время
     * @param {String}      [format] Формат времени
     * @returns {Moment|undefined}
     */
    MomentUtils.prototype.parseTime = function (timeStr, format) {
        if (timeStr) {
            if (Moment.isDate(timeStr)) {
                return this.fromDate(timeStr);
            }
            return Moment(timeStr, format || TIME_FORMAT);
        }
    };

    /**
     * Парсинг даты и времени
     *
     * @param {Date|String} dateTimeStr Дата и время
     * @param {String}      [format]    Формат даты и времени
     * @returns {Moment|undefined}
     */
    MomentUtils.prototype.parseDateTime = function (dateTimeStr, format) {
        if (dateTimeStr) {
            if (Moment.isDate(dateTimeStr)) {
                return this.fromDate(dateTimeStr);
            }
            return Moment(dateTimeStr, format || DATETIME_FORMAT);
        }
    };
})();