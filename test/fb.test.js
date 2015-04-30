(function () {
    'use strict';

    var assert = require('assert');
    var q = require('q');

    var fb = require('..').fb;

    var options = {
        database: 'localhost/3050:d:/bases/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('fb.utils', function () {
        it('parseUrl', function () {
            var parsed;

            parsed = fb.utils.parseUrl(null);
            assert.equal(parsed, null);

            parsed = fb.utils.parseUrl('');
            assert.equal(parsed, null);

            parsed = fb.utils.parseUrl('localhost:d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, 'localhost', 'invalid host');
            assert.equal(parsed.port, '', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');

            parsed = fb.utils.parseUrl('localhost/3050:d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, 'localhost', 'invalid host');
            assert.equal(parsed.port, '3050', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');

            parsed = fb.utils.parseUrl('d:/test.fdb');
            assert.notEqual(parsed, null, 'nothing parsed');
            assert.equal(parsed.host, '', 'invalid host');
            assert.equal(parsed.port, '', 'invalid port');
            assert.equal(parsed.database, 'd:/test.fdb', 'invalid database ');
        });
    });

    describe('fb.pool', function () {
        it('pool.init, pool.close', function (done) {
            fb.pool.init(options.database, options.user, options.password);
            assert(fb.pool.isInited(), 'poll is not inited');

            fb.pool.close().then(function () {
                assert(!fb.pool.isInited(), 'poll is not closed');
                done();
            }).done();
        });
    });

    describe('fb.tr', function () {
        it('tr.getRead and rollback', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (transaction) {
                assert.notEqual(transaction, null);

                return fb.pool.close().finally(done);
            }).done();
        });

        it('read transaction must be always the same', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (transaction) {
                assert.notEqual(transaction, null);

                return fb.tr.getRead().then(function (transaction1) {
                    assert.notEqual(transaction1, null);
                    assert.equal(transaction1, transaction);

                    return fb.pool.close().finally(done);
                });
            }).done();
        });
    });

    describe('fb.sql', function () {
        it('execute query on custom transaction and return result', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return fb.sql.query(tr, 'SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]).then(function (result) {
                    assert.notEqual(result, null);
                    assert.equal(result.length, 1);
                    assert.equal(result[0].num, 3);

                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('execute read query and return result', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.sql.queryRead('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]).then(function (result) {
                assert.notEqual(result, null);
                assert.equal(result.length, 1);
                assert.equal(result[0].num, 3);

                done();
            }).done();
        });

        it('execute write query and return result', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.sql.queryWrite('SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database', [2]).then(function (result) {
                assert.notEqual(result, null);
                assert.equal(result.length, 1);
                assert.equal(result[0].num, 3);

                done();
            }).done();
        });

        it('prepares statement and repeatedly executes it', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            var sql = 'SELECT 1 + CAST(? AS INTEGER) AS num FROM rdb$database';

            fb.tr.getRead().then(function (tr) {
                return fb.sql.prepare(tr, sql).then(function (statement) {
                    assert.notEqual(statement, null);

                    return q()
                        .then(function () {
                            return fb.sql.execute(tr, statement, [1]).then(function (result) {
                                assert.equal(result[0].num, 2);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return fb.sql.execute(tr, statement, [2]).then(function (result) {
                                assert.equal(result[0].num, 3);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return fb.sql.execute(tr, statement, [3]).then(function (result) {
                                assert.equal(result[0].num, 4);
                                statement.close();
                            });
                        })
                        .then(function () {
                            statement.drop();

                            done();
                        });
                });
            }).done();
        });

        it('statement can execute procedure', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            var sql = 'EXECUTE PROCEDURE test_procedure';

            fb.tr.getRead().then(function (tr) {
                return fb.sql.prepare(tr, sql).then(function (statement) {
                    assert.notEqual(statement, null);

                    return q()
                        .then(function () {
                            return fb.sql.execute(tr, statement, [1]).then(function (result) {
                                assert.equal(result[0].return_value, 1);
                                statement.close();
                            });
                        })
                        .then(function () {
                            statement.drop();

                            done();
                        });
                });
            }).done();
        });

        it('statement can execute DML', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            var sql = 'INSERT INTO test_table (int_field) VALUES (?)';

            fb.tr.getWrite().then(function (tr) {
                return fb.sql.prepare(tr, sql).then(function (statement) {
                    assert.notEqual(statement, null);

                    statement.close();

                    return q()
                        .then(function () {
                            return fb.sql.execute(tr, statement, [1]).then(function (result) {
                                assert.notEqual(result, null);
                                assert.equal(result.length, 0);
                            });
                        })
                        .then(function () {
                            statement.close();
                            return fb.sql.execute(tr, statement, [2]).then(function (result) {
                                assert.notEqual(result, null);
                                assert.equal(result.length, 0);
                                statement.close();
                            });
                        })
                        .then(function () {
                            return fb.sql.query(tr, 'DELETE FROM test_table');
                        })
                        .then(function () {
                            statement.drop();

                            return fb.tr.commit(tr);
                        })
                        .then(function() {
                            done();
                        });
                });
            }).done();
        });
    });

    describe('fb.metadata', function () {
        it('can check generator existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.generatorExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent generator');
                    });
                }).then(function () {
                    return fb.metadata.generatorExists(tr, 'test_generator').then(function (exists) {
                        assert.equal(exists, true, 'Existent generator not found');
                    });
                }).then(function () {
                    return fb.metadata.generatorExists(tr, 'test_generator_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent generator');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check domain existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.domainExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent domain');
                    });
                }).then(function () {
                    return fb.metadata.domainExists(tr, 'test_domain').then(function (exists) {
                        assert.equal(exists, true, 'Existent domain not found');
                    });
                }).then(function () {
                    return fb.metadata.domainExists(tr, 'test_domain_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent domain');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check table existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.tableExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent table');
                    });
                }).then(function () {
                    return fb.metadata.tableExists(tr, 'test_table').then(function (exists) {
                        assert.equal(exists, true, 'Existent table not found');
                    });
                }).then(function () {
                    return fb.metadata.tableExists(tr, 'test_table_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent table');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check field existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.fieldExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent table field');
                    });
                }).then(function () {
                    return fb.metadata.fieldExists(tr, 'test_table', 'int_field').then(function (exists) {
                        assert.equal(exists, true, 'Existent table field not found');
                    });
                }).then(function () {
                    return fb.metadata.fieldExists(tr, 'test_table_1', 'int_field').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent table field');
                    });
                }).then(function () {
                    return fb.metadata.fieldExists(tr, 'test_table', 'int_field_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent table field');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check index existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.indexExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent index');
                    });
                }).then(function () {
                    return fb.metadata.indexExists(tr, 'test_x_table').then(function (exists) {
                        assert.equal(exists, true, 'Existent index not found');
                    });
                }).then(function () {
                    return fb.metadata.indexExists(tr, 'test_x_table_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent index');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check procedure existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.procedureExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent procedure');
                    });
                }).then(function () {
                    return fb.metadata.procedureExists(tr, 'test_procedure').then(function (exists) {
                        assert.equal(exists, true, 'Existent procedure not found');
                    });
                }).then(function () {
                    return fb.metadata.procedureExists(tr, 'test_procedure_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent procedure');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check trigger existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.triggerExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent trigger');
                    });
                }).then(function () {
                    return fb.metadata.triggerExists(tr, 'test_bi_table').then(function (exists) {
                        assert.equal(exists, true, 'Existent trigger not found');
                    });
                }).then(function () {
                    return fb.metadata.triggerExists(tr, 'test_bi_table_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent trigger');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('can check exception existence', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getRead().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.metadata.exceptionExists(tr, '').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent exception');
                    });
                }).then(function () {
                    return fb.metadata.exceptionExists(tr, 'test_exception').then(function (exists) {
                        assert.equal(exists, true, 'Existent exception not found');
                    });
                }).then(function () {
                    return fb.metadata.exceptionExists(tr, 'test_exception_1').then(function (exists) {
                        assert.equal(exists, false, 'Found not existent exception');
                    });
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });
    });

    describe('fb.migration', function () {
        before(function (done) {
            dropMigrationTable(done);
        });

        it('create migrations metadata', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getWrite().then(function (tr) {
                return fb.migration.init(tr).then(function () {
                    return fb.metadata.tableExists(tr, 'rf_migration').then(function (exists) {
                        assert.equal(exists, true, 'rf_migration table was not created by fb.migration.init');
                    });
                }).then(function () {
                    return fb.tr.commit(tr);
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        it('check log && insert log', function (done) {
            fb.pool.init(options.database, options.user, options.password);

            fb.tr.getWrite().then(function (tr) {
                return q.resolve().then(function () {
                    return fb.migration.check(1).then(function (exists) {
                        assert(!exists, 'Found non existing migration');
                    });
                }).then(function () {
                    return fb.migration.log(tr, 1, 'migration', null, 'author');
                }).then(function () {
                    return fb.migration.check(1, tr).then(function (exists) {
                        assert(exists, 'Not found existing migration');
                    });
                }).then(function () {
                    return fb.tr.commit(tr);
                }).then(function () {
                    return fb.pool.close().finally(done);
                });
            }).done();
        });

        after(function (done) {
            dropMigrationTable(done);
        });

        function dropMigrationTable(done) {
            fb.pool.init(options.database, options.user, options.password);

            return fb.tr.getWrite().then(function (tr) {
                return fb.metadata.tableExists(tr, 'rf_migration').then(function (exists) {
                    if (exists) {
                        return fb.sql.query(tr, 'DROP TABLE rf_migration').then(function () {
                            return fb.tr.commit(tr);
                        });
                    }
                });
            }).then(function () {
                return fb.pool.close().finally(done);
            }).done();
        }
    });
})();