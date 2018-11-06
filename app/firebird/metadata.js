(function () {
    'use strict';

    const Promise = require('bluebird');
    const Utils = require('./utils');

    /**
     * Методы для работы с метаданными
     */
    class Metadata {
        constructor(connection) {
            this.connection = connection;
        }

        generatorExists(generatorName) {
            if (!generatorName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$generator_name FROM rdb$generators WHERE rdb$generator_name = ?
            `;
            return this.connection.queryRead(sql, [generatorName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        domainExists(domainName) {
            if (!domainName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$field_name FROM rdb$fields WHERE rdb$field_name = ?
            `;
            return this.connection.queryRead(sql, [domainName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        tableExists(tableName) {
            if (!tableName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$relation_name FROM rdb$relations WHERE rdb$relation_name = ?
            `;
            return this.connection.queryRead(sql, [tableName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        fieldExists(tableName, fieldName) {
            if (!tableName || !fieldName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$relation_name FROM rdb$relation_fields WHERE rdb$relation_name = ? AND rdb$field_name = ?
            `;
            return this.connection.queryRead(sql, [tableName.toUpperCase(), fieldName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        indexExists(indexName) {
            if (!indexName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$index_name FROM rdb$indices WHERE rdb$index_name = ?
            `;
            return this.connection.queryRead(sql, [indexName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        procedureExists(procedureName) {
            if (!procedureName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$procedure_name FROM rdb$procedures WHERE rdb$procedure_name = ?
            `;
            return this.connection.queryRead(sql, [procedureName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        triggerExists(triggerName) {
            if (!triggerName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$trigger_name FROM rdb$triggers WHERE rdb$trigger_name = ?
            `;
            return this.connection.queryRead(sql, [triggerName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        exceptionExists(exceptionName) {
            if (!exceptionName) {
                return Promise.resolve(false);
            }

            const sql = `
                SELECT rdb$exception_name FROM rdb$exceptions WHERE rdb$exception_name = ?
            `;
            return this.connection.queryRead(sql, [exceptionName.toUpperCase()])
                .then((result) => result && result.length > 0);
        }

        primaryKeyExists(tableName, primaryKeyName) {
			if (!tableName || !primaryKeyName) {
				return Promise.resolve(false);
			}

			const sql = `
                SELECT rdb$relation_name 
                FROM rdb$relation_constraints 
                WHERE 
                	rdb$constraint_type = 'PRIMARY KEY' 
                	AND rdb$relation_name = ? 
                	AND rdb$constraint_name = ?
            `;
			return this.connection.queryRead(sql, [tableName.toUpperCase(), primaryKeyName.toUpperCase()])
				.then((result) => result && result.length > 0);
		}

		foreignKeyExists(tableName, foreignKeyName) {
			if (!tableName || !foreignKeyName) {
				return Promise.resolve(false);
			}

			const sql = `
                SELECT rdb$relation_name 
                FROM rdb$relation_constraints 
                WHERE 
                	rdb$constraint_type = 'FOREIGN KEY' 
                	AND rdb$relation_name = ? 
                	AND rdb$constraint_name = ?
            `;
			return this.connection.queryRead(sql, [tableName.toUpperCase(), foreignKeyName.toUpperCase()])
				.then((result) => result && result.length > 0);
		}

        getServerVersion() {
            const sql = `
                SELECT COALESCE(rdb$get_context('SYSTEM', 'ENGINE_VERSION'), '') AS version FROM rdb$database
            `;
            return this.connection.queryRead(sql, [])
                .then((result) => {
                    const versionStr = (result && result.length > 0) ? result[0].version : '';
                    return Utils.parseServerVersion(versionStr);
                });
        }
    }

    module.exports = Metadata;
})();