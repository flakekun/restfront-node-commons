(function() {
    'use strict';

    const Moment = require('moment');

    const
        DATE_FORMAT = 'YYYY-MM-DD',
        TIME_FORMAT = 'HH:mm:ss',
        DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

    module.exports = {
        now,
        fromDate,

        formatDate,
        formatTime,
        formatDateTime,

        parseDate,
        parseTime,
        parseDateTime
    };

    function now() {
        return new Moment();
    }

    /**
     * Создать moment на основе переданной даты
     *
     * @param {Date} date Дата
     * @returns {Moment|undefined}
     */
    function fromDate(date) {
        if (date) {
            return Moment(date);
        }
    }

    /**
     * Форматировать дату в строку
     *
     * @param {Moment|Date|String} date     Дата
     * @param {String}             [format] Формат
     * @returns {String}
     */
    function formatDate(date, format) {
        if (!date) { return ''; }

        if (!Moment.isMoment(date)) {
            date = parseDate(date);
        }
        return date ? date.format(format ? format : DATE_FORMAT) : '';
    }

    /**
     * Форматировать время в строку
     *
     * @param {Moment|Date|String} time     Время
     * @param {String}             [format] Формат
     * @returns {String}
     */
    function formatTime(time, format) {
        if (!time) { return ''; }

        if (!Moment.isMoment(time)) {
            time = parseTime(time);
        }
        return time ? time.format(format ? format : TIME_FORMAT) : '';
    }

    /**
     * Форматировать дату и время в строку
     *
     * @param {Moment|Date|String} dateTime Дата и время
     * @param {String}             [format] Формат
     * @returns {String}
     */
    function formatDateTime(dateTime, format) {
        if (!dateTime) { return ''; }

        if (!Moment.isMoment(dateTime)) {
            dateTime = parseDateTime(dateTime);
        }
        return dateTime ? dateTime.format(format ? format : DATETIME_FORMAT) : '';
    }

    /**
     * Парсинг даты
     *
     * @param {Date|String} dateStr  Дата
     * @param {String}      [format] Формат даты
     * @returns {Moment|undefined}
     */
    function parseDate(dateStr, format) {
        if (dateStr) {
            if (Moment.isDate(dateStr)) {
                return fromDate(dateStr);
            }
            return Moment(dateStr, format || DATE_FORMAT);
        }
    }

    /**
     * Парсинг времени
     *
     * @param {Date|String} timeStr  Время
     * @param {String}      [format] Формат времени
     * @returns {Moment|undefined}
     */
    function parseTime(timeStr, format) {
        if (timeStr) {
            if (Moment.isDate(timeStr)) {
                return fromDate(timeStr);
            }
            return Moment(timeStr, format || TIME_FORMAT);
        }
    }

    /**
     * Парсинг даты и времени
     *
     * @param {Date|String} dateTimeStr Дата и время
     * @param {String}      [format]    Формат даты и времени
     * @returns {Moment|undefined}
     */
    function parseDateTime(dateTimeStr, format) {
        if (dateTimeStr) {
            if (Moment.isDate(dateTimeStr)) {
                return fromDate(dateTimeStr);
            }
            return Moment(dateTimeStr, format || DATETIME_FORMAT);
        }
    }
})();