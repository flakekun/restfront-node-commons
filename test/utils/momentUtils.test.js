(function () {
    'use strict';

    var assert = require('assert');

    var MomentUtils = require('../../app/utils/momentUtils');

    describe('momentUtils', function () {
        it('parseDate', function () {
            var date;

            date = MomentUtils.parseDate('2015-05-13');
            assert(MomentUtils.formatDate(date, 'YYYY-MM-DD') === '2015-05-13');

            date = MomentUtils.parseDate('13.05.2015', 'DD.MM.YYYY');
            assert(MomentUtils.formatDate(date, 'YYYY-MM-DD') === '2015-05-13');

            date = MomentUtils.parseDate('5/13/2015', 'MM/DD/YYYY');
            assert(MomentUtils.formatDate(date, 'YYYY-MM-DD') === '2015-05-13');

            date = MomentUtils.parseDate('10/13/2015', 'MM/DD/YYYY');
            assert(MomentUtils.formatDate(date, 'YYYY-MM-DD') === '2015-10-13');
        });

        it('parseTime', function () {
            var time;

            time = MomentUtils.parseTime('13:56');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '13:56:00');

            time = MomentUtils.parseTime('13:56:43');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '13:56:43');

            time = MomentUtils.parseTime('1:56 PM', 'h:mm:ss a');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '13:56:00');

            time = MomentUtils.parseTime('1:56 AM', 'h:mm:ss a');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '01:56:00');

            time = MomentUtils.parseTime('12:56 PM', 'h:mm:ss a');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '12:56:00');

            time = MomentUtils.parseTime('12:56 AM', 'h:mm:ss a');
            assert(MomentUtils.formatTime(time, 'HH:mm:ss') === '00:56:00');
        });

        it('parseDateTime', function () {
            var dateTime;

            dateTime = MomentUtils.parseDateTime('2015-05-13 13:56');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-05-13 13:56:00');

            dateTime = MomentUtils.parseDateTime('2015-05-13 13:56:43');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-05-13 13:56:43');

            dateTime = MomentUtils.parseDateTime('13.05.2015 1:56 PM', 'DD.MM.YYYY h:mm:ss a');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-05-13 13:56:00');

            dateTime = MomentUtils.parseDateTime('5/13/2015 1:56 AM', 'MM/DD/YYYY h:mm:ss a');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-05-13 01:56:00');

            dateTime = MomentUtils.parseDateTime('10/13/2015 12:56 PM', 'MM/DD/YYYY h:mm:ss a');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-10-13 12:56:00');

            dateTime = MomentUtils.parseDateTime('10/13/2015 12:56 AM', 'MM/DD/YYYY h:mm:ss a');
            assert(MomentUtils.formatTime(dateTime, 'YYYY-MM-DD HH:mm:ss') === '2015-10-13 00:56:00');
        });
    });
})();