(function () {
    'use strict';

    var Promise = require('bluebird');
    var Utils = require('./utils');

    module.exports = Metadata;

    /**
     * Методы для работы с метаданными
     */
    function Metadata(connection) {
        this.connection = connection;
    }

    Metadata.prototype.generatorExists = function (generatorName) {
        if (!generatorName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$generator_name FROM rdb$generators WHERE rdb$generator_name = ?";
        return this.connection.queryRead(sql, [generatorName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.domainExists = function (domainName) {
        if (!domainName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$field_name FROM rdb$fields WHERE rdb$field_name = ?";
        return this.connection.queryRead(sql, [domainName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.tableExists = function (tableName) {
        if (!tableName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$relation_name FROM rdb$relations WHERE rdb$relation_name = ?";
        return this.connection.queryRead(sql, [tableName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.fieldExists = function (tableName, fieldName) {
        if (!tableName || !fieldName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$relation_name FROM rdb$relation_fields WHERE rdb$relation_name = ? AND rdb$field_name = ?";
        return this.connection.queryRead(sql, [tableName.toUpperCase(), fieldName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.indexExists = function (indexName) {
        if (!indexName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$index_name FROM rdb$indices WHERE rdb$index_name = ?";
        return this.connection.queryRead(sql, [indexName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.procedureExists = function (procedureName) {
        if (!procedureName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$procedure_name FROM rdb$procedures WHERE rdb$procedure_name = ?";
        return this.connection.queryRead(sql, [procedureName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.triggerExists = function (triggerName) {
        if (!triggerName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$trigger_name FROM rdb$triggers WHERE rdb$trigger_name = ?";
        return this.connection.queryRead(sql, [triggerName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.exceptionExists = function (exceptionName) {
        if (!exceptionName) { return Promise.resolve(false); }

        var sql = "SELECT rdb$exception_name FROM rdb$exceptions WHERE rdb$exception_name = ?";
        return this.connection.queryRead(sql, [exceptionName.toUpperCase()]).then(function (result) {
            return result && result.length > 0;
        });
    };

    Metadata.prototype.getServerVersion = function () {
        var sql = "SELECT COALESCE(rdb$get_context('SYSTEM', 'ENGINE_VERSION'), '') AS version FROM rdb$database";
        return this.connection.queryRead(sql, [])
            .then(function (result) {
                var versionStr = (result && result.length > 0) ? result[0].version : '';
                return Utils.parseServerVersion(versionStr);
            });
    };
})();