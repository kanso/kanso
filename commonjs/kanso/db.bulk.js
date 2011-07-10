/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing lists of documents
 * via CouchDB's bulk-fetch / bulk-update HTTP API.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./db.core'),
    utils = require('kanso/utils'),
    sanitize = require('kanso/sanitize'),
    _ = require('kanso/underscore')._;


/**
 * Saves a list of documents, without using separate requests.
 * This function uses CouchDB's HTTP bulk document API (_bulk_docs).
 * The return value is an array of objects, each containing an 'id'
 * and a 'rev' field. The return value is passed to the callback you
 * provide via its second argument; the first argument of the callback
 * is reserved for any exceptions that occurred (node.js style).
 *
 * @name bulkSave(docs, [options], callback)
 * @param {Array} docs An array of documents; each document is an object
 * @param {Object} options (optional) Options for the bulk-save operation.
 *          options.db: The name of the database to use, or false-like
 *              to use Kanso's current database.
 *          options.transactional: Require that all documents be saved
 *              successfully (or saved with a conflict); otherwise roll
 *              back the operation. This uses the 'all_or_nothing' option
 *              provided by CouchDB.
 * @param {Function} callback A function to accept results and/or errors.
 *          Document update conflicts are reported in the results array.
 * @api public
 */

exports.bulkSave = function (docs, /*optional*/ options, callback) {
    var url;

    if (!utils.isBrowser()) {
        throw new Error(
            'bulkSave cannot be called server-side'
        );
    }
    if (!_.isArray(docs)) {
        throw new Error(
            'bulkSave requires an array of documents to work properly'
        );
    }
    if (!callback) {
        /* Arity = 2: Omits options */
        callback = options;
        options = {};
    }
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }
    var data = {
        docs: docs,
        all_or_nothing: !!options.transactional
    };
    var req = {
        type: 'POST',
        url: url + '/_bulk_docs',
        data: JSON.stringify(data),
        processData: false,
        contentType: 'application/json',
        expect_json: true
    };
    core.request(req, callback);
};


/**
 * Requests a list of documents, using only a single HTTP request.
 * This function uses CouchDB's HTTP bulk document API (_all_docs).
 * The return value is an array of objects, each of which is a document.
 * The return value is passed to the callback you provide via its second
 * argument; the first argument of the callback is reserved for any
 * exceptions that occurred (node.js style).
 *
 * @name bulkGet(docs, [options], callback)
 * @param {Array} docs An array of documents identifiers (i.e. strings).
 * @param {Object} options (optional) Options for the bulk-read operation.
 *          options.db: The name of the database to use, or false-like
 *              to use Kanso's current database.
 * @param {Function} callback A function to accept results and/or errors.
 *          Document update conflicts are reported in the results array.
 * @api public
 */

exports.bulkGet = function (keys, /*optional*/ q,
                            /*optional*/ options, callback) {
    var url;

    if (!utils.isBrowser()) {
        throw new Error(
            'bulkGet cannot be called server-side'
        );
    }
    if (keys && !_.isArray(keys)) {
        throw new Error(
            'bulkGet requires that _id values be supplied as a list'
        );
    }
    if (!callback) {
        if (!options) {
            /* Arity = 2: Omits q, options */
            callback = q;
            options = {};
            q = {};
        } else {
          /* Arity = 3: Omits options */
            callback = options;
            options = {};
        }
    }
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }

    /* Encode every query-string option:
        CouchDB requires that these be JSON, even though they
        will be URL-encoded as part of the request process. */

    for (var k in q) {
        q[k] = JSON.stringify(q[k]);
    }

    /* Make request:
        If we have a list of keys, use a post request containing
        a JSON-encoded list of keys. Otherwise, use a get request. */

    var req = {
        expect_json: true,
        url: url + '/_all_docs' + sanitize.url(q)
    };
    if (keys) {
        req = _.extend(req, {
            type: 'POST',
            processData: false,
            contentType: 'application/json',
            data: JSON.stringify({ keys: keys })
        });
    } else {
        req = _.extend(req, {
            type: 'GET'
        });
    }

    core.request(req, callback);
};

