/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    var assert = require('assert');
    var auth = require('../app/auth');

    describe('auth', function () {
        it('should hash password', function (done) {
            var password = 'test_password';
            return auth.hashPassword(password)
                .then(function (hashed) {
                    assert.notEqual(password, hashed);
                    done();
                })
                .done();
        });

        it('should validate hashed password', function (done) {
            var password = 'test_password';
            return auth.hashPassword(password)
                .then(function (hashed) {
                    return auth.validatePassword(password, hashed);
                })
                .then(function (isValid) {
                    assert(isValid);
                    done();
                })
                .done();
        });
    });
})();