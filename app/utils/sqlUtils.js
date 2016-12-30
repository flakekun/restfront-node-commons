(function () {
    'use strict';

    module.exports.formatPaginationClause = function (pagination) {
        if (pagination) {
            var pageSize = Number(pagination.size) || 1;
            var skip = Number(pagination.skip) || 0;

            return "ROWS " + (skip + 1) + " TO " + (skip + pageSize);
        }
        return "";
    };

})();