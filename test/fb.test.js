(function () {
    'use strict';

    var assert = require('assert');
    var Promise = require('bluebird');

    var fb = require('..').fb;
    var FirebirdUtils = require('../app/firebird/utils');

    var options = {
        database: 'rf-server/3050:d:/bases/test/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('fb.utils', function () {
        it('parseUrl', function () {
            var parsed;

            parsed = fb.parseUrl(null);
            assert.equal(parsed, null);

            parsed = fb.parseUrl('');
            assert.equal(parsed, null);

            parsed = fb.parseUrl('localhost:d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, 'localhost', 'invalid host');
            assert.equal(parsed.port, '', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');

            parsed = fb.parseUrl('localhost/3050:d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, 'localhost', 'invalid host');
            assert.equal(parsed.port, '3050', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');

            parsed = fb.parseUrl('d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, '', 'invalid host');
            assert.equal(parsed.port, '', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');
        });

        it('parseServerVersion', function() {
            var parsed;

            parsed = FirebirdUtils.parseServerVersion(null);
            assert.deepEqual(parsed, {major: 0, minor: 0, patch: 0});

            parsed = FirebirdUtils.parseServerVersion('');
            assert.deepEqual(parsed, {major: 0, minor: 0, patch: 0});

            parsed = FirebirdUtils.parseServerVersion('1');
            assert.deepEqual(parsed, {major: 1, minor: 0, patch: 0});

            parsed = FirebirdUtils.parseServerVersion('2.1');
            assert.deepEqual(parsed, {major: 2, minor: 1, patch: 0});

            parsed = FirebirdUtils.parseServerVersion('2.5.3');
            assert.deepEqual(parsed, {major: 2, minor: 5, patch: 3});

            parsed = FirebirdUtils.parseServerVersion('3.0.3.1');
            assert.deepEqual(parsed, {major: 3, minor: 0, patch: 3});
        });
    });

    describe('fb.pool', function () {
        it('pool.getConnection', function (done) {
            var pool = fb.createPool(5, options.database, options.user, options.password);
            assert(pool != null, 'pool is not created');

            pool.getConnection()
                .then(function (connection) {
                    assert(connection.isConnected(), 'connection is not opened');

                    return connection.queryRead('SELECT 1 AS num FROM rdb$database')
                        .then(function(result) {
                            assert.notEqual(result, null);
                            assert.equal(result.length, 1);
                            assert.equal(result[0].num, 1);
                        })
                        .then(function() {
                            return pool.close();
                        })
                        .then(function () {
                            done();
                        });
                })
                .done();
        });
    });


    describe('fb.connection', function () {
        it('connection.open, connection.close', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            assert(connection != null, 'connection is not created');

            connection.open()
                .then(function () {
                    assert(connection.isConnected(), 'connection is not opened');

                    return connection.close()
                        .then(function () {
                            assert(!connection.isConnected(), 'connection is not closed');
                            done();
                        });
                })
                .done();
        });
    });

    describe('fb.transactions', function () {
        it('tr.getRead and rollback', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getReadTransaction()
                        .then(function (transaction) {
                            assert.notEqual(transaction, null);

                            return transaction.rollback()
                                .finally(function () {
                                    done();
                                });
                        });
                })
                .done();
        });

        it('read transaction must be always the same', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getReadTransaction()
                        .then(function (transaction1) {
                            assert.notEqual(transaction1, null);

                            return connection.getReadTransaction()
                                .then(function (transaction2) {
                                    assert.notEqual(transaction2, null);
                                    assert.equal(transaction1, transaction2);

                                    return connection.close()
                                        .finally(function() {
                                            done();
                                        });
                                });
                        });
                })
                .done();
        });

        it('read transaction must not write', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getReadTransaction()
                        .then(function (transaction) {
                            return transaction.query('INSERT INTO test_table (int_field) VALUES (1) RETURNING int_field')
                                .then(function(result) {
                                    assert.fail('Read transaction did update. Must be an exception');
                                })
                                .catch(function(e) {
                                    assert.notEqual(e, null);
                                    assert.equal(e.code, 335544361);  // attempted update during read-only transaction
                                })
                                .finally(function () {
                                    done();
                                });
                        });
                })
                .done();
        });
    });

    describe('fb.queries', function () {
        it('execute query on custom transaction and return result', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getWriteTransaction();
                })
                .then(function (transaction) {
                    return transaction.query('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2])
                        .then(function (result) {
                            assert.notEqual(result, null);
                            assert.equal(result.length, 1);
                            assert.equal(result[0].num, 3);
                        })
                        .then(transaction.rollback.bind(transaction));
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('execute read query and return result', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.queryRead('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]);
                })
                .then(function (result) {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('execute write query and return result', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.queryWrite('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]);
                })
                .then(function (result) {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('transaction can query', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getReadTransaction();
                })
                .then(function (transaction) {
                    return transaction.query('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2])
                        .then(function (result) {
                            assert.notEqual(result, null);
                            assert.equal(result.length, 1);
                            assert.equal(result[0].num, 3);
                        });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('prepares statement and repeatedly executes it', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.prepareReadStatement('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database');
                })
                .then(function (statement) {
                    assert.notEqual(statement, null);

                    return Promise.resolve()
                        .then(function () {
                            return statement.execute([1]).then(function (result) {
                                assert.equal(result[0].num, 2);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return statement.execute([2]).then(function (result) {
                                assert.equal(result[0].num, 3);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return statement.execute([3]).then(function (result) {
                                assert.equal(result[0].num, 4);
                                statement.close();
                            });
                        })
                        .then(statement.drop.bind(statement));
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('transaction can prepare statement', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getReadTransaction();
                })
                .then(function (transaction) {
                    return transaction.prepareStatement('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database');
                })
                .then(function (statement) {
                    assert.notEqual(statement, null);

                    return Promise.resolve()
                        .then(function () {
                            return statement.execute([1]).then(function (result) {
                                assert.equal(result[0].num, 2);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return statement.execute([2]).then(function (result) {
                                assert.equal(result[0].num, 3);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return statement.execute([3]).then(function (result) {
                                assert.equal(result[0].num, 4);
                                statement.close();
                            });
                        })
                        .then(statement.drop.bind(statement));
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('statement can execute procedure', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.prepareReadStatement('EXECUTE PROCEDURE test_procedure');
                })
                .then(function (statement) {
                    assert.notEqual(statement, null);

                    return statement.execute([1])
                        .then(function (result) {
                            assert.equal(result[0].return_value, 1);
                            statement.close();
                        })
                        .then(statement.drop.bind(statement));
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('statement can execute DML', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(function () {
                    return connection.getWriteTransaction();
                })
                .then(function (transaction) {
                    return transaction.prepareStatement('INSERT INTO test_table (int_field) VALUES (?)')
                        .then(function (statement) {
                            return Promise.resolve()
                                .then(function () {
                                    return statement.execute([1]).then(function (result) {
                                        assert.notEqual(result, null);
                                        assert.equal(result.length, 0);

                                        statement.close();
                                    });
                                })
                                .then(function () {
                                    return statement.execute([2]).then(function (result) {
                                        assert.notEqual(result, null);
                                        assert.equal(result.length, 0);

                                        statement.close();
                                    });
                                })
                                .then(statement.drop.bind(statement));
                        })
                        .then(function () {
                            return transaction.query('DELETE FROM test_table');
                        })
                        .then(transaction.commit.bind(transaction));
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });
    });

    describe('fb.metadata', function () {
        it('can check generator existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.generatorExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent generator');
                        });
                    }).then(function () {
                        return connection.metadata.generatorExists('test_generator').then(function (exists) {
                            assert.equal(exists, true, 'Existent generator not found');
                        });
                    }).then(function () {
                        return connection.metadata.generatorExists('test_generator_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent generator');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check domain existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.domainExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent domain');
                        });
                    }).then(function () {
                        return connection.metadata.domainExists('test_domain').then(function (exists) {
                            assert.equal(exists, true, 'Existent domain not found');
                        });
                    }).then(function () {
                        return connection.metadata.domainExists('test_domain_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent domain');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check table existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function (tr) {
                    return Promise.resolve().then(function () {
                        return connection.metadata.tableExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent table');
                        });
                    }).then(function () {
                        return connection.metadata.tableExists('test_table').then(function (exists) {
                            assert.equal(exists, true, 'Existent table not found');
                        });
                    }).then(function () {
                        return connection.metadata.tableExists('test_table_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent table');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check field existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.fieldExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent table field');
                        });
                    }).then(function () {
                        return connection.metadata.fieldExists('test_table', 'int_field').then(function (exists) {
                            assert.equal(exists, true, 'Existent table field not found');
                        });
                    }).then(function () {
                        return connection.metadata.fieldExists('test_table_1', 'int_field').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent table field');
                        });
                    }).then(function () {
                        return connection.metadata.fieldExists('test_table', 'int_field_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent table field');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check index existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.indexExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent index');
                        });
                    }).then(function () {
                        return connection.metadata.indexExists('test_x_table').then(function (exists) {
                            assert.equal(exists, true, 'Existent index not found');
                        });
                    }).then(function () {
                        return connection.metadata.indexExists('test_x_table_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent index');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check procedure existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.procedureExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent procedure');
                        });
                    }).then(function () {
                        return connection.metadata.procedureExists('test_procedure').then(function (exists) {
                            assert.equal(exists, true, 'Existent procedure not found');
                        });
                    }).then(function () {
                        return connection.metadata.procedureExists('test_procedure_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent procedure');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check trigger existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function (tr) {
                    return Promise.resolve().then(function () {
                        return connection.metadata.triggerExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent trigger');
                        });
                    }).then(function () {
                        return connection.metadata.triggerExists('test_bi_table').then(function (exists) {
                            assert.equal(exists, true, 'Existent trigger not found');
                        });
                    }).then(function () {
                        return connection.metadata.triggerExists('test_bi_table_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent trigger');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check exception existence', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.exceptionExists('').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent exception');
                        });
                    }).then(function () {
                        return connection.metadata.exceptionExists('test_exception').then(function (exists) {
                            assert.equal(exists, true, 'Existent exception not found');
                        });
                    }).then(function () {
                        return connection.metadata.exceptionExists('test_exception_1').then(function (exists) {
                            assert.equal(exists, false, 'Found not existent exception');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('can check server version', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return Promise.resolve().then(function () {
                        return connection.metadata.getServerVersion().then(function (version) {
                            assert.notEqual(version);
                            assert.equal(version.major, 2, 'Invalid MAJOR server version');
                            assert.equal(version.minor, 5, 'Invalid MINOR server version');
                            assert.equal(version.patch, 3, 'Invalid PATCH server version');
                        });
                    });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });
    });

    describe('fb.migration', function () {
        before(function (done) {
            dropMigrationTable(done);
        });

        it('create migrations metadata', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return connection.migration.init();
                })
                .then(function () {
                    return connection.metadata.tableExists('rf_migration')
                        .then(function (exists) {
                            assert.equal(exists, true, 'rf_migration table was not created by fb.migration.init');
                        });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        it('check log && insert log', function (done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return connection.migration.check(1)
                        .then(function (exists) {
                            assert(!exists, 'Found non existing migration');
                        });
                })
                .then(function () {
                    return connection.getWriteTransaction()
                        .then(function (tr) {
                            return connection.migration.log(tr, 1, 'migration', null, 'author')
                                .then(tr.commit.bind(tr));
                        });
                })
                .then(function () {
                    return connection.migration.check(1)
                        .then(function (exists) {
                            assert(exists, 'Not found existing migration');
                        });
                })
                .then(connection.close.bind(connection))
                .then(function() {
                    done();
                })
                .done();
        });

        after(function (done) {
            dropMigrationTable(done);
        });

        function dropMigrationTable(done) {
            var connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(function () {
                    return connection.getWriteTransaction();
                })
                .then(function (tr) {
                    return connection.metadata.tableExists('rf_migration')
                        .then(function (exists) {
                            if (exists) {
                                return connection.query(tr, 'DROP TABLE rf_migration');
                            }
                        })
                        .then(tr.commit.bind(tr));
                })
                .then(connection.close.bind(connection))
                .then(function () {
                    done();
                })
                .done();
        }
    });
})();