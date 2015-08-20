(function () {
    'use strict';

    var assert = require('assert');

    var MomentUtils = require('../../app/utils/momentUtils');

    describe('momentUtils', function () {
        it('parseDate', function () {
            assert(MomentUtils.formatDate(MomentUtils.parseDate('2015-05-13'), 'YYYY-MM-DD') === '2015-05-13');
            assert(MomentUtils.formatDate(MomentUtils.parseDate('13.05.2015', 'DD.MM.YYYY'), 'YYYY-MM-DD') === '2015-05-13');
            assert(MomentUtils.formatDate(MomentUtils.parseDate('5/13/2015', 'MM/DD/YYYY'), 'YYYY-MM-DD') === '2015-05-13');
            assert(MomentUtils.formatDate(MomentUtils.parseDate('10/13/2015', 'MM/DD/YYYY'), 'YYYY-MM-DD') === '2015-10-13');
        });
    });
})();