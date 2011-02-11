/*global $: false, kanso: true */

/**
 * Module dependencies
 */

var utils = require('./utils');


/**
 * Returns a function for handling ajax responsed from jquery and calls
 * the callback with the data or appropriate error.
 *
 * @param {Function} callback
 * @api private
 */

function onComplete(callback) {
    return function (req) {
        var resp = $.httpData(req, "json");
        if (req.status === 200) {
            callback(null, resp);
        }
        else if (resp.error) {
            var err = new Error(resp.reason || resp.error);
            err.error = resp.error;
            err.reason = resp.reason;
            err.status = req.status;
            callback(err);
        }
        else {
            // TODO: map status code to meaningful error message
            callback(new Error('Returned status code: ' + req.status));
        }
    };
}


/**
 * Make a request, with some default settings and proper callback
 * handling.
 *
 * @param {Object} options
 * @param {Function} callback
 */

// TODO: add unit tests for this function
exports.request = function (options, callback) {
    options.complete = onComplete(callback);
    options.dataType = 'json';
    $.ajax(options);
};


/**
 * Fetches a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @param {String} id
 * @param {Object} q
 * @param {Function} callback
 */

// TODO: add unit tests for this function
// TODO: make q argument optional?
exports.getDoc = function (id, q, callback) {
    if (!utils.isBrowser) {
        throw new Error('getDoc cannot be called server-side');
    }
    var req = {
        url: utils.getBaseURL() + '/_db/' + id,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Fetches a view from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @param {String} view
 * @param {Object} q
 * @param {Function} callback
 */

// TODO: add unit tests for this function
// TODO: make q argument optional?
exports.getView = function (view, q, callback) {
    if (!utils.isBrowser) {
        throw new Error('getView cannot be called server-side');
    }
    var base = utils.getBaseURL();
    var req = {
        url: base + '/_db/_design/' + kanso.name + '/_view/' + view,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Properly encodes query parameters to CouchDB views etc. Handle complex
 * keys and other non-string parameters by passing through JSON.stringify.
 * Returns a shallow-copied clone of the original query after complex values
 * have been stringified.
 *
 * @param {Object} query
 * @returns {Object}
 */

// TODO: add unit tests for this function
exports.stringifyQuery = function (query) {
    var q = {};
    for (var k in query) {
        if (typeof query[k] !== 'string') {
            q[k] = JSON.stringify(query[k]);
        }
        else {
            q[k] = query[k];
        }
    }
    return q;
};
