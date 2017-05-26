(function () {
    'use strict';

    const HTTPStatus = require('http-status');

    /**
     * HTTP 400 Bad Request
     * @param message
     * @constructor
     */
    class BadRequest extends Error {
        constructor(message) {
            super(message);
            this.message = message;
            this.status = HTTPStatus.BAD_REQUEST;
            this.name = HTTPStatus[this.status];
        }
    }

    /**
     * HTTP 500 Internal Server Error
     * @param message
     * @constructor
     */
    class ServerError extends Error {
        constructor(message) {
            super(message);
            this.message = message;
            this.status = HTTPStatus.INTERNAL_SERVER_ERROR;
            this.name = HTTPStatus[this.status];
        }
    }

    /**
     * HTTP 401 Unauthorized
     * @param message
     * @constructor
     */
    class UnauthorizedError extends Error {
        constructor(message) {
            super(message);
            this.message = message;
            this.status = HTTPStatus.UNAUTHORIZED;
            this.name = HTTPStatus[this.status];
        }
    }

    /**
     * HTTP 404 Not Found
     * @param message
     * @constructor
     */
    class NotFoundError extends Error {
        constructor(message) {
            super(message);
            this.message = message;
            this.status = HTTPStatus.NOT_FOUND;
            this.name = HTTPStatus[this.status];
        }
    }

    /**
     * HTTP 406 Not Acceptable
     * @param message
     * @constructor
     */
    class NotAcceptableError extends Error {
        constructor(message) {
            super(message);
            this.message = message;
            this.status = HTTPStatus.NOT_ACCEPTABLE;
            this.name = HTTPStatus[this.status];
        }
    }

    module.exports = {
        BadRequest,
        ServerError,
        UnauthorizedError,
        NotFoundError,
        NotAcceptableError
    };
})();
