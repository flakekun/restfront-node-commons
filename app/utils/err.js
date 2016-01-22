(function () {
    'use strict';

    var HTTPStatus = require('http-status');

    module.exports = new Err();

    function Err() { }

    Err.prototype.UnauthorizedError = UnauthorizedError;
    Err.prototype.NotFoundError = NotFoundError;
    Err.prototype.NotAcceptableError = NotAcceptableError;

    /**
     * HTTP 401 Unauthorized
     * @param message
     * @constructor
     */
    function UnauthorizedError(message) {
        this.name = 'UnauthorizedError';
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.UNAUTHORIZED;
    }

    UnauthorizedError.prototype = Object.create(Error.prototype);
    UnauthorizedError.prototype.constructor = UnauthorizedError;

    /**
     * HTTP 404 Not Found
     * @param message
     * @constructor
     */
    function NotFoundError(message) {
        this.name = 'NotFoundError';
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.NOT_FOUND;
    }

    NotFoundError.prototype = Object.create(Error.prototype);
    NotFoundError.prototype.constructor = NotFoundError;

    /**
     * HTTP 409 Not Acceptable
     * @param message
     * @constructor
     */
    function NotAcceptableError(message) {
        this.name = 'NotAcceptableError';
        this.message = message;
        this.stack = (new Error()).stack;
        this.status = HTTPStatus.NOT_ACCEPTABLE;
    }

    NotAcceptableError.prototype = Object.create(Error.prototype);
    NotAcceptableError.prototype.constructor = NotAcceptableError;
})();
