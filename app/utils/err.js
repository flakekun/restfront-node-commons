(function () {
    'use strict';

    var HTTPStatus = require('http-status');

    module.exports = new Err();

    function Err() { }

    Err.prototype.ServerError = ServerError;
    Err.prototype.UnauthorizedError = UnauthorizedError;
    Err.prototype.NotFoundError = NotFoundError;
    Err.prototype.NotAcceptableError = NotAcceptableError;

    /**
     * HTTP 500 Internal Server Error
     * @param message
     * @constructor
     */
    function ServerError(message) {
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.INTERNAL_SERVER_ERROR;
        this.name = HTTPStatus[this.status];
    }
    ServerError.prototype = Object.create(Error.prototype);
    ServerError.prototype.constructor = ServerError;

    /**
     * HTTP 401 Unauthorized
     * @param message
     * @constructor
     */
    function UnauthorizedError(message) {
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.UNAUTHORIZED;
        this.name = HTTPStatus[this.status];
    }

    UnauthorizedError.prototype = Object.create(Error.prototype);
    UnauthorizedError.prototype.constructor = UnauthorizedError;

    /**
     * HTTP 404 Not Found
     * @param message
     * @constructor
     */
    function NotFoundError(message) {
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.NOT_FOUND;
        this.name = HTTPStatus[this.status];
    }

    NotFoundError.prototype = Object.create(Error.prototype);
    NotFoundError.prototype.constructor = NotFoundError;

    /**
     * HTTP 406 Not Acceptable
     * @param message
     * @constructor
     */
    function NotAcceptableError(message) {
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.NOT_ACCEPTABLE;
        this.name = HTTPStatus[this.status];
    }

    NotAcceptableError.prototype = Object.create(Error.prototype);
    NotAcceptableError.prototype.constructor = NotAcceptableError;
})();
