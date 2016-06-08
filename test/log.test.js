/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    var assert = require('assert');
    var log = require('../app/log');

    describe('log', function () {
        before(function() {
            log.init('./log', 'test');
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