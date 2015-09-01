(function () {
    'use strict';

    var Q = require('q');

    module.exports = Transaction;

    /**
     * Обертка над Firebird транзакцией
     *
     * @param transaction Firebird транзакция
     * @constructor
     */
    function Transaction(transaction) {
        this.transaction = transaction;
    }

    /**
     * Коммит транзакции
     *
     * @promise {}
     */
    Transaction.prototype.commit = function () {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            self.transaction.commit(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };

    /**
     * Откат транзакции
     *
     * @promise {}
     */
    Transaction.prototype.rollback = function () {
        var self = this;
        return Q.Promise(function (resolve, reject) {
            self.transaction.rollback(function (err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    };
})();
