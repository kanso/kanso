/*global $: false, kanso: true */

/**
 * Contains functions for querying and setting data
 * related to replication operations in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./db.core'),
    utils = require('kanso/utils');


/**
 * Fetches the most recent revision of the replication document
 * referred to by the id parameter.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name getReplication(id, callback)
 * @param {String} id
 * @param {Function} callback
 * @api public
 */

exports.getReplication = function (id, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getReplication cannot be called server-side');
    }
    var req = {
        url: '/_replicator/' + core.encode(id),
        cache: false /* Work around IE7 issue */
    };
    core.request(req, callback);
};

/**
 * Replicates options.source to options.target. The strings
 * options.source and options.target are each either a
 * CouchDB database name or a CouchDB database URI.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name startReplication(options, callback)
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.startReplication = function (options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('startReplication cannot be called server-side');
    }
    if (!options.source) {
        throw new Error('source parameter must be provided');
    }
    if (!options.target) {
        throw new Error('target parameter must be provided');
    }
    var req = {
        type: 'POST',
        url: '/_replicator',
        data: JSON.stringify(options),
        contentType: 'application/json'
    };
    core.request(req, callback);
};

/**
 * Waits for a replication operation to enter a specific state.
 * waitReplication polls the _replication database using the
 * doc provided, and evaluates state_function(doc) at each iteration.
 * This function stops polling and invokes callback when the
 * state_function evaluates to true. If state_function is not
 * provided, waitReplication waits for the doc's _replication_state
 * to change from 'triggered' to 'completed' (or 'error').
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name waitReplication(doc, [options, state_function], callback)
 * @param {Object} doc
 * @param {Function} state_function (optional)
 * @param {Function} callback
 * @api public
 */

exports.waitReplication = function (doc, /*optional*/options, /*optional*/state_function, callback) {
    if (!utils.isBrowser()) {
        throw new Error('waitReplication cannot be called server-side');
    }
    var default_state_function = function (recent_doc, initial_doc) {
        return (
          recent_doc._replication_state === 'completed' ||
              recent_doc._replication_state === 'error'
        );
    };
    if (!callback) {
        if (!state_function) {
            /* Arity = 2: doc, callback */
            callback = options;
            options = {};
            state_function = default_state_function;
        } else {
            /* Arity = 3: doc, options, callback */
            callback = state_function;
            state_function = default_state_function;
        }
    }
    if (options === undefined) {
        options = {};
    }
    if (options.limit === undefined) {
        options.limit = 100; /* times */
    }
    if (options.delay === undefined) {
        options.delay = 2000; /* ms */
    }

    /* Fetch latest revision */
    exports.getReplication(doc.id, function (err, rv) {

        /* Check for error, then for an interesting event */
        if (err || state_function(rv, doc)) {
            return callback(err, rv, doc);
        }
        /* Termination condition for recursion... */
        if (options.limit > 0) {

            /* ...with well-defined progress toward it */
            options.limit -= 1;

            /* Go around */
            return setTimeout(function () {
                return exports.waitReplication(
                    doc, options, state_function, callback
                );
            }, options.delay);
        }
    });
};

/**
 * Stops a replication operation already in progress.
 * The doc parameter can be obtained by calling getReplication.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites to /_replicator, which will also mean turning
 * off safe rewrites.
 *
 * This function only works with CouchDB >= 1.1, since it uses the
 * _replicator database.
 *
 * @name stopReplication(doc, callback, [options])
 * @param {String} id
 * @param {Function} callback
 * @param {Function} options
 * @api public
 */

exports.stopReplication = function (doc, callback, /*optional*/options) {

    if (!utils.isBrowser()) {
        throw new Error('stopReplication cannot be called server-side');
    }

    if (options === undefined) {
        options = {};
    }
    if (options.limit === undefined || options.limit === null) {
        options.limit = 3; /* times */
    }
    if (options.delay === undefined || options.delay === null) {
        options.delay = 500; /* ms */
    }

    var req = {
        type: 'DELETE',
        url: '/_replicator/' +
          core.encode(doc._id) +
          '?rev=' + core.encode(doc._rev)
    };

    core.request(req, function (err, rv) {

        if (err && err.status === 409) {  /* Document update conflict */

            /* Race condition:
                The CouchDB replication finished (or was updated) between
                the caller's getReplication and now. Subject to restrictions
                in options, call getReplication and then try again. */

            /* Termination condition for recursion... */
            if (options.limit > 0) {

                /* ...with well-defined progress toward it */
                options.limit -= 1;

                return exports.getReplication(doc._id, function (e, d) {
                    if (e) {
                        throw new Error(
                          'The specified replication document changed ' +
                          'since last read, and we failed to re-request it'
                        );
                    }
                    /* Go around */
                    setTimeout(function () {
                        return exports.stopReplication(d, callback, options);
                    }, options.delay);
                });
            }

        } else {

            /* Normal case:
                Replication document was not changed since the last
                read; go ahead and invoke the callback and return. */

            return callback(err, rv);
        }

        /* Not reached */
        return false;

    });

};

