/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    var log = require('../app/log');

    describe('log', function () {
        before(function() {
            log.initFileLog('./log', 'test');
        });

        it('should log', function () {
            log.silly('message');
            log.debug('message');
            log.verbose('message');
            log.info('message');
            log.warn('message');
            log.error('message');
        });
    });
})();