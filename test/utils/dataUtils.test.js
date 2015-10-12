(function () {
    'use strict';

    var assert = require('assert');

    var DataUtils = require('../../app/utils/dataUtils');

    describe('dataUtils', function () {
        it('get', function() {
            var data = {
                first: 'aaa',
                second: 0,
                third: null,
                fourth: '',
                fifth: undefined
            };

            assert.strictEqual(DataUtils.get(data, 'first'), 'aaa');
            assert.strictEqual(DataUtils.get(data, 'second'), 0);
            assert.strictEqual(DataUtils.get(data, 'third'), undefined);
            assert.strictEqual(DataUtils.get(data, 'fourth'), '');

            assert.strictEqual(DataUtils.get(data, 'FIRST'), 'aaa');
            assert.strictEqual(DataUtils.get(data, 'SECOND'), 0);
            assert.strictEqual(DataUtils.get(data, 'THIRD'), undefined);
            assert.strictEqual(DataUtils.get(data, 'FOURTH'), '');

            assert.strictEqual(DataUtils.get(data, ['fff', 'First']), 'aaa');
            assert.strictEqual(DataUtils.get(data, ['sss', 'Second']), 0);
            assert.strictEqual(DataUtils.get(data, ['ttt', 'Third']), undefined);
            assert.strictEqual(DataUtils.get(data, ['fff', 'Fourth']), '');

            assert.strictEqual(DataUtils.get(data, 'third', 1), 1);
            assert.strictEqual(DataUtils.get(data, 'fifth', 1), 1);
            assert.strictEqual(DataUtils.get(data, 'sixth', 1), 1);
        });

        it('isValidKey', function() {
            assert(DataUtils.isValidKey(1));
            assert(DataUtils.isValidKey(100));
            assert(DataUtils.isValidKey('1'));

            assert(!DataUtils.isValidKey());
            assert(!DataUtils.isValidKey('a'));
            assert(!DataUtils.isValidKey(-1));
            assert(!DataUtils.isValidKey(0));
        });

        it('validKeyOrNull', function() {
            assert.strictEqual(DataUtils.validKeyOrNull(1), 1);
            assert.strictEqual(DataUtils.validKeyOrNull(0), null);
            assert.strictEqual(DataUtils.validKeyOrNull(), null);
            assert.strictEqual(DataUtils.validKeyOrNull(10000000), 10000000);
            assert.strictEqual(DataUtils.validKeyOrNull('1'), '1');
            assert.strictEqual(DataUtils.validKeyOrNull('a'), null);
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