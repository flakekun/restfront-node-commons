(function () {
    'use strict';

    module.exports = {
        formatPaginationClause
    };

    function formatPaginationClause(pagination) {
        if (pagination) {
            const pageSize = Number(pagination.size) || 1;
            const skip = Number(pagination.skip) || 0;

            return "ROWS " + (skip + 1) + " TO " + (skip + pageSize);
        }
        return "";
    }
})();