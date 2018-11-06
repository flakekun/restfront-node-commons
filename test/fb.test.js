/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    const assert = require('assert');
    const Promise = require('bluebird');

    const fb = require('..').fb;
    const FirebirdUtils = require('../app/firebird/utils');
    const DataUtils = require('../app/utils/dataUtils');

    const options = {
        database: 'rf-server/3050:d:/bases/test/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('fb.utils', function () {
        it('parseUrl', function () {
            let parsed;

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

        it('parseServerVersion', function () {
            let parsed;

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
            const pool = fb.createPool(options.database, options.user, options.password, {max: 3});
            assert(pool != null, 'pool is not created');

            Promise
                .map([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (value) => {
                    return pool.acquire(0)
                        .then((connection) => {
                            assert(connection.isConnected(), 'connection is not opened');

                            return connection.queryRead('SELECT ' + value + ' AS num FROM rdb$database')
                                .then((result) => {
                                    assert.notEqual(result, null);
                                    assert.equal(result.length, 1);
                                    assert.equal(DataUtils.get(result[0], 'num'), value);
                                })
                                .then(() => pool.release(connection));
                        });
                }, {concurrency: 10})
                .then(() => done())
                .done();
        });
    });

    describe('fb.connection', function () {
        it('connection.open, connection.close', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            assert(connection != null, 'connection is not created');

            connection.open()
                .then(() => {
                    assert(connection.isConnected(), 'connection is not opened');
                })
                .then(() => connection.close())
                .then(() => {
                    assert(!connection.isConnected(), 'connection is not closed');
                })
                .then(() => done())
                .done();
        });
    });

    describe('fb.transactions', function () {
        it('tr.getRead', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => {
                    return connection.getReadTransaction()
                        .then((transaction) => {
                            assert.notEqual(transaction, null);
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('read transaction must be always the same', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => {
                    return connection.getReadTransaction()
                        .then((transaction1) => {
                            assert.notEqual(transaction1, null);

                            return connection.getReadTransaction()
                                .then((transaction2) => {
                                    assert.notEqual(transaction2, null);
                                    assert.equal(transaction1, transaction2);
                                });
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('read transaction must not write', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => {
                    return connection.getReadTransaction()
                        .then((transaction) => {
                            return transaction.query('INSERT INTO test_table (int_field) VALUES (1) RETURNING int_field')
                                .then((result) => {
                                    assert.fail('Read transaction did update. Must be an exception');
                                })
                                .catch((e) => {
                                    assert.notEqual(e, null);
                                    assert.equal(e.message, "attempted update during read-only transaction");
                                    // assert.equal(e.code, 335544361);  // attempted update during read-only transaction
                                });
                        });
                })
                .then(() => done())
                .done();
        });
    });

    describe('fb.queries', function () {
        it('execute query on custom transaction and return result', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.getWriteTransaction())
                .then((transaction) => {
                    return transaction.query('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2])
                        .then((result) => {
                            assert.notEqual(result, null);
                            assert.equal(result.length, 1);
                            assert.equal(result[0].num, 3);
                        })
                        .then(() => transaction.rollback());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('execute read query and return result', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.queryRead('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]))
                .then((result) => {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('execute write query and return result', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.queryWrite('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]))
                .then((result) => {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('transaction can query', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.getReadTransaction())
                .then((transaction) => transaction.query('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]))
                .then((result) => {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('prepares statement and repeatedly executes it', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.prepareReadStatement('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database'))
                .then((statement) => {
                    assert.notEqual(statement, null);

                    return Promise.resolve()
                        .then(() => statement.execute([1]))
                        .then((result) => {
                            assert.equal(result[0].num, 2);
                            return statement.close();
                        })

                        .then(() => statement.execute([2]))
                        .then((result) => {
                            assert.equal(result[0].num, 3);
                            return statement.close();
                        })

                        .then(() => statement.execute([3]))
                        .then((result) => {
                            assert.equal(result[0].num, 4);
                            return statement.close();
                        })

                        .then(() => statement.drop());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('transaction can prepare statement', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.getReadTransaction())
                .then((transaction) => transaction.prepareStatement('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database'))
                .then((statement) => {
                    assert.notEqual(statement, null);

                    return Promise.resolve()
                        .then(() => statement.execute([1]))
                        .then((result) => {
                            assert.equal(result[0].num, 2);
                            return statement.close();
                        })

                        .then(() => statement.execute([2]))
                        .then((result) => {
                            assert.equal(result[0].num, 3);
                            return statement.close();
                        })

                        .then(() => statement.execute([3]))
                        .then((result) => {
                            assert.equal(result[0].num, 4);
                            return statement.close();
                        })

                        .then(() => statement.drop());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('statement can execute procedure', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.prepareReadStatement('EXECUTE PROCEDURE test_procedure'))
                .then((statement) => {
                    assert.notEqual(statement, null);

                    return statement.execute([1])
                        .then((result) => {
                            assert.equal(result.return_value, 1);
                            return statement.close();
                        })
                        .then(() => statement.drop());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('statement can execute DML', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);

            connection.open()
                .then(() => connection.getWriteTransaction())
                .then((transaction) => {
                    return transaction.prepareStatement('INSERT INTO test_table (int_field) VALUES (?)')
                        .then((statement) => {
                            return Promise.resolve()
                                .then(() => statement.execute([1]))
                                .then((result) => {
                                    assert.notEqual(result, null);
                                    assert.equal(result.length, 0);

                                    return statement.close();
                                })

                                .then(() => statement.execute([2]))
                                .then((result) => {
                                    assert.notEqual(result, null);
                                    assert.equal(result.length, 0);

                                    return statement.close();
                                })

                                .then(() => statement.drop());
                        })
                        .then(() => transaction.query('DELETE FROM test_table'))
                        .then(() => transaction.commit());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });
    });

    describe('fb.metadata', function () {
        it('can check generator existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.generatorExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent generator');
                        })

                        .then(() => connection.metadata.generatorExists('test_generator'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent generator not found');
                        })

                        .then(() => connection.metadata.generatorExists('test_generator_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent generator');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check domain existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.domainExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent domain');
                        })

                        .then(() => connection.metadata.domainExists('test_domain'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent domain not found');
                        })

                        .then(() => connection.metadata.domainExists('test_domain_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent domain');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check table existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.tableExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent table');
                        })

                        .then(() => connection.metadata.tableExists('test_table'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent table not found');
                        })

                        .then(() => connection.metadata.tableExists('test_table_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent table');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check field existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.fieldExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent table field');
                        })

                        .then(() => connection.metadata.fieldExists('test_table', 'int_field'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent table field not found');
                        })

                        .then(() => connection.metadata.fieldExists('test_table_1', 'int_field'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent table field');
                        })

                        .then(() => connection.metadata.fieldExists('test_table', 'int_field_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent table field');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

		it('can check primary key existence', function (done) {
			const connection = fb.createConnection(options.database, options.user, options.password);
			connection.open()
				.then(() => {
					return Promise.resolve()
						.then(() => connection.metadata.primaryKeyExists('key_field', 'pk_key_field'))
						.then((exists) => {
							assert.equal(exists, true, 'Found not existent index1');
						})

						.then(() => connection.metadata.primaryKeyExists('key_field2', 'pk_key_field'))
						.then((exists) => {
							assert.equal(exists, false, 'Found not existent index1');
						})

						.then(() => connection.metadata.primaryKeyExists('key_field2', 'pk_key_field2'))
						.then((exists) => {
							assert.equal(exists, true, 'Found not existent index');
						});
				})
				.then(() => connection.close())
				.then(() => done())
				.done();
		});

		it('can check foreign key existence', function (done) {
			const connection = fb.createConnection(options.database, options.user, options.password);
			connection.open()
				.then(() => {
					return Promise.resolve()
						.then(() => connection.metadata.foreignKeyExists('key_field', 'fk_key_field_1'))
						.then((exists) => {
							assert.equal(exists, true, 'Found not existent index1');
						})

						.then(() => connection.metadata.foreignKeyExists('key_field', 'fk_key_field_2'))
						.then((exists) => {
							assert.equal(exists, false, 'Found not existent index');
						});
				})
				.then(() => connection.close())
				.then(() => done())
				.done();
		});

        it('can check index existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.indexExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent index');
                        })

                        .then(() => connection.metadata.indexExists('test_x_table'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent index not found');
                        })

                        .then(() => connection.metadata.indexExists('test_x_table_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent index');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check procedure existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.procedureExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent procedure');
                        })

                        .then(() => connection.metadata.procedureExists('test_procedure'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent procedure not found');
                        })

                        .then(() => connection.metadata.procedureExists('test_procedure_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent procedure');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check trigger existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.triggerExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent trigger');
                        })

                        .then(() => connection.metadata.triggerExists('test_bi_table'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent trigger not found');
                        })

                        .then(() => connection.metadata.triggerExists('test_bi_table_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent trigger');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check exception existence', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => {
                    return Promise.resolve()
                        .then(() => connection.metadata.exceptionExists(''))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent exception');
                        })

                        .then(() => connection.metadata.exceptionExists('test_exception'))
                        .then((exists) => {
                            assert.equal(exists, true, 'Existent exception not found');
                        })

                        .then(() => connection.metadata.exceptionExists('test_exception_1'))
                        .then((exists) => {
                            assert.equal(exists, false, 'Found not existent exception');
                        });
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('can check server version', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => connection.metadata.getServerVersion())
                .then((version) => {
                    assert.notEqual(version);
                    assert(version.major > 0, 'Invalid MAJOR server version');
                    assert(version.minor > 0, 'Invalid MINOR server version');
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });
    });

    describe('fb.migration', function () {
        before(function (done) {
            dropMigrationTable(done);
        });

        it('create migrations metadata', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => connection.migration.init())
                .then(() => connection.metadata.tableExists('rf_migration'))
                .then((exists) => {
                    assert.equal(exists, true, 'rf_migration table was not created by fb.migration.init');
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        it('check log && insert log', function (done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => connection.migration.check('', 1))
                .then((exists) => {
                    assert(!exists, 'Found non existing migration');
                })

                .then(() => connection.getWriteTransaction())
                .then((tr) => {
                    return connection.migration.log(tr, '', 1, 'migration', null, 'author')
                        .then(() => tr.commit());
                })

                .then(() => connection.migration.check('', 1))
                .then((exists) => {
                    assert(exists, 'Not found existing migration');
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        });

        after(function (done) {
            dropMigrationTable(done);
        });

        function dropMigrationTable(done) {
            const connection = fb.createConnection(options.database, options.user, options.password);
            connection.open()
                .then(() => connection.getWriteTransaction())
                .then((tr) => {
                    return connection.metadata.tableExists('rf_migration')
                        .then((exists) => {
                            if (exists) {
                                return connection.query(tr, 'DROP TABLE rf_migration');
                            }
                        })
                        .then(() => tr.commit());
                })
                .then(() => connection.close())
                .then(() => done())
                .done();
        }
    });
})();