(function () {
    'use strict';

    var assert = require('assert');

    var DataUtils = require('../../app/utils/dataUtils');

    describe('dataUtils', function () {
        it('isValidKey', function() {
            assert(DataUtils.isValidKey(1));
            assert(DataUtils.isValidKey(100));
            assert(DataUtils.isValidKey('1'));

            assert(!DataUtils.isValidKey());
            assert(!DataUtils.isValidKey('a'));
            assert(!DataUtils.isValidKey(-1));
            assert(!DataUtils.isValidKey(0));
        });

        it('parseKey', function () {
            assert.strictEqual(DataUtils.parseKey('1'), 1);
            assert.strictEqual(DataUtils.parseKey('10'), 10);

            assert.strictEqual(DataUtils.parseKey(''), -1);
            assert.strictEqual(DataUtils.parseKey(null), -1);
            assert.strictEqual(DataUtils.parseKey(), -1);
        });

        it('filterKeys', function () {
            var original = [null, 4, '2', '2', null, 3, undefined, 'aaa', 1];
            var result = DataUtils.filterKeys(original);

            assert.strictEqual(result.length, 4);
            assert.strictEqual(result[0], 4);
            assert.strictEqual(result[1], 2);
            assert.strictEqual(result[2], 3);
            assert.strictEqual(result[3], 1);

            assert.throws(DataUtils.filterKeys.bind(DataUtils, undefined));
            assert.throws(DataUtils.filterKeys.bind(DataUtils, {}));
            assert.throws(DataUtils.filterKeys.bind(DataUtils, ''));
            assert.throws(DataUtils.filterKeys.bind(DataUtils, 1));
        });
    });
})();