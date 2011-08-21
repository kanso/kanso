/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing data in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('kanso/utils'),
    settings = require('settings/root'),
    sanitize = require('kanso/sanitize'),
    _ = require('underscore')._,
    session = null;

/* Avoid a circular require in CouchDB */

if (utils.isBrowser) {
    try {
        session = require('./session');
    }
    catch (e) {
        // may not be available
    }
}


/**
 * When a db call results in an unauthorized response, the user's session is
 * checked to see if their session has timed out or they've logged out in
 * another screen.
 *
 * This check is throttled to once per second, to avoid flooding the server if
 * multiple requests are made with incorrect permissions.
 */

var last_session_check = 0;


/**
 * Cache for use by exports.request -- keeps track of
 * completed and in-process requests from Kanso to CouchDB.
 */

exports.request_cache = {};
exports.request_cache_wait_queue = {};


/**
 * Taken from jQuery 1.4.4 so we can support more recent versions of jQuery.
 */

var httpData = function (xhr, type, s) {
    var ct = xhr.getResponseHeader("content-type") || "",
        xml = type === "xml" || !type && ct.indexOf("xml") >= 0,
        data = xml ? xhr.responseXML : xhr.responseText;

    if (xml && data.documentElement.nodeName === "parsererror") {
        $.error("parsererror");
    }
    if (s && s.dataFilter) {
        data = s.dataFilter(data, type);
    }
    if (typeof data === "string") {
        if (type === "json" || !type && ct.indexOf("json") >= 0) {
            data = $.parseJSON(data);
        }
        else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
            $.globalEval(data);
        }
    }
    return data;
};


/**
 * Returns a function for handling ajax responsed from jquery and calls
 * the callback with the data or appropriate error.
 *
 * @param {Function} callback
 * @api private
 */

function onComplete(options, callback) {
    return function (req) {
        var resp;
        var ctype = req.getResponseHeader('Content-Type');
        if (ctype === 'application/json' || ctype === 'text/json') {
            try {
                resp = httpData(req, "json");
            }
            catch (e) {
                return exports._invoke_request_callback(
                    e, null, options, callback
                );
            }
        }
        else {
            if (options.expect_json) {
                try {
                    resp = httpData(req, "json");
                }
                catch (ex) {
                    return callback(
                        new Error('Expected JSON response, got ' + ctype)
                    );
                }
            }
            else {
                resp = req.responseText;
            }
        }
        if (req.status === 401) {
            // returned 'Unauthorized', check the user's session if it's not
            // been checked on an 'Unauthorized' repsonse in the last second
            if (session && last_session_check < new Date().getTime() - 1000) {
                session.info();
            }
        }
        if (req.status === 200 || req.status === 201 || req.status === 202) {
            exports._invoke_request_callback(
                null, resp, options, callback
            );
        }
        else if (resp.error || resp.reason) {
            var err = new Error(resp.reason || resp.error);
            err.error = resp.error;
            err.reason = resp.reason;
            err.code = resp.code;
            err.status = req.status;
            exports._invoke_request_callback(
                err, null, options, callback
            );
        }
        else {
            // TODO: map status code to meaningful error message
            var err2 = new Error('Returned status code: ' + req.status);
            err2.status = req.status;
            exports._invoke_request_callback(err2, null, options, callback);
        }
    };
}

/**
 * Encodes a document id or view, list or show name.
 *
 * @name encode(str)
 * @param {String} str
 * @returns {String}
 * @api public
 */

exports.encode = function (str) {
    return encodeURIComponent(str).replace(/^_design%2F/, '_design/');
};


/**
 * Make a request, with some default settings, proper callback
 * handling, and optional caching. Used behind-the-scenes by
 * most other DB module functions.
 *
 * @name request(options, callback)
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.request = function (options, callback) {

    options.complete = onComplete(options, callback);
    options.dataType = 'json';

    if (options.flush_cache) {
        exports._request_cache_remove(options);
    }

    if (exports._should_cache_request(options)) {
        if (exports._begin_cached_request(options, callback)) {
            $.ajax(options);
        }
    } else {
        $.ajax(options);
    }
};


/* Support for in-interpreter request caching:
    The following functions are used to support the caching of
    AJAX request results. If a to-be-cached resource has been
    requested but not yet returned, a wait queue is employed. */

/**
 * Clear the in-interpreter request cache. Use this function if
 * you need to ensure that the in-interpreter cache is empty,
 * e.g. inside of a test case. If {options} is left undefined, this
 * function destroys the *entire* request cache for *all* callers
 * of subsystems that rely upon db.request. To be more selective
 * and clear only a portion of the cache, supply the {options}
 * argument. The {options} argument is in the same format as that
 * used in options.request (i.e. with url and data properties).
 */
exports.clear_request_cache = function (options) {
    if (options) {
        var key = exports._make_request_cache_key(options);
        delete exports.request_cache[key];
    } else {
        exports.request_cache = {};
    }
}

/**
 * Returns true if the AJAX request described by {options}
 * should be cached by the in-interpreter request caching
 * code. In general, this sort of caching is limited to requests
 * that (i) request caching explicitly, and (ii) have no side-effects.
 */
exports._should_cache_request = function (options) {
    return (
        (!options.type || options.type === 'GET') &&
            options.use_cache
    );
};

/**
 * Returns a string that uniquely identifies the AJAX request
 * described by {options}. This string is used to look up cache entries.
 */
exports._make_request_cache_key = function (options) {
    return options.url + (
        _.isString(options.data) ? '?' + options.data :
            sanitize.escapeUrlParams(options.data || {})
    );
};

/**
 * If caching is not appropriate for the AJAX request described by
 * {options}, invoke {callback} in the usual way. If caching is
 * appropriate, add the result to the request cache, and notify all
 * of the waiting requests that a response has arrived.
 */
exports._invoke_request_callback = function (err, resp, options, callback) {

    if (exports._should_cache_request(options)) {
        exports._request_cache_add(err, resp, options, true);
        exports._finish_cached_request(options);
    } else {
        callback(err, resp);
    }
};

/**
 * Add information describing a completed AJAX request to the
 * in-interpreter request cache. This information will be handed
 * out to identical requests that occur in the future. If {clone}
 * is true, then the information provided will be cloned before
 * it is entered in to the cache. Otherwise, you must take care
 * not to later modify the values you provided -- unless you also
 * want those modifications to occur in the cache as well.
 */
exports._request_cache_add = function (error, response, options, clone) {

    var cache_key = exports._make_request_cache_key(options);
    var response_clone = JSON.parse(JSON.stringify(response));

    exports.request_cache[cache_key] = {
        error: error,
        response: response_clone
    };
};

/**
 * Retrieve information describing a completed AJAX request from
 * the in-interpreter request cache. If no information is available,
 * this function will return undefined. If {clone} is true, then
 * the completed request's response data will be deep-cloned
 * before it is returned. Otherwise, this function will return the
 * cache's internal version of the data, which should not be modified.
 */
exports._request_cache_fetch = function (options, clone) {

    var cache_key = exports._make_request_cache_key(options);
    var rv = exports.request_cache[cache_key];
    
    if (rv && clone) {
        rv = _.clone(rv);
        rv.response = JSON.parse(JSON.stringify(rv.response));
    }

    return rv;
};

/**
 * Remove information describing a completed AJAX request from the
 * in-interpreter request cache. This forces the next identical
 * request to make an actual HTTP request.
 */
exports._request_cache_remove = function (options) {

    var cache_key = exports._make_request_cache_key(options);
    delete exports.request_cache[cache_key];
};

/**
 * Start the process of issuing a cache request. This function
 * has one of three outcomes: (i) in the case of a cache hit,
 * the callback is immediately invoked, and given the cached
 * response; (ii) if a cache miss occurs, and another request
 * is already in progress, we place ourself on a queue to wait
 * for that request's response; (iii) in any other case, we
 * tell the caller to make an actual HTTP request, and add
 * ourself as the first queue waiter.
 */
exports._begin_cached_request = function (options, callback) {

    var should_send_request = false;
    var cache_key = exports._make_request_cache_key(options);
    var cache_item = exports._request_cache_fetch(options, true);

    if (cache_item) {

        /* Cache hit: Invoke callback and return */
        callback(cache_item.error, cache_item.response);

    } else {
        /* Cache miss */
        if (!exports.request_cache_wait_queue[cache_key]) {

            /* Request not already-in-progress:
                Instruct caller to issue actual HTTP request. */

            exports.request_cache_wait_queue[cache_key] = [];
            should_send_request = true;
        }

        /* Add this request to notification queue */
        exports.request_cache_wait_queue[cache_key].push(
            { options: options, callback: callback }
        );
    }

    return should_send_request;
};

/**
 * Finish a request, using an item already in the request cache.
 * First, the cached result is retrieved from the cache. Second,
 * all waiters on the request cache's wait queue are notified.
 * Finally, the wait queue is emptied. The cached result is
 * removed as well if the result was an error.
 */
exports._finish_cached_request = function (options) {

    var cache_key = exports._make_request_cache_key(options);
    var cache_item = exports._request_cache_fetch(options, true);
    var request_queue = (exports.request_cache_wait_queue[cache_key] || []);

    for (var i = 0, len = request_queue.length; i < len; ++i) {
        request_queue[i].callback(
            cache_item.error, cache_item.response
        );
    }

    if (cache_item.error) {
        exports._request_cache_remove(options);
    }

    delete exports.request_cache_wait_queue[cache_key];
};


/**
 * Fetches a rewrite from the database the app is running on. Results
 * are passed to the callback, with the first argument of the callback
 * reserved for any exceptions that occurred (node.js style).
 *
 * @name getRewrite(path, [q], callback)
 * @param {String} path
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

exports.getRewrite = function (path, /*optional*/q, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getRewrite cannot be called server-side');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    // prepend forward-slash if missing
    path = (path[0] === '/') ? path: '/' + path;

    var base = utils.getBaseURL();
    var name = exports.encode(settings.name);
    var req = {
        url: base + '/_db/_design/' + name + '/_rewrite' + path,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Fetches a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name getDoc(id, [q, options], callback)
 * @param {String} id
 * @param {Object} q (optional)
 * @param {Object} options (optional)
 * @param {Function} callback
 * @api public
 */

exports.getDoc = function (id, /*optional*/q, /*optional*/options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getDoc cannot be called server-side');
    }
    if (!id) {
        throw new Error('getDoc requires an id parameter to work properly');
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
    var url;
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }
    var req = {
        url: url + '/' + exports.encode(id),
        expect_json: true,
        use_cache: options.useCache,
        flush_cache: options.flushCache,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Saves a document to the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name saveDoc(doc, [options], callback)
 * @param {Object} doc
 * @param {Object} options (optional)
 * @param {Function} callback
 * @api public
 */

exports.saveDoc = function (doc, /*optional*/options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('saveDoc cannot be called server-side');
    }
    var method, url;
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }
    if (!callback) {
        /* Arity = 2: Omits options */
        callback = options;
        options = {};
    }
    if (doc._id === undefined) {
        method = "POST";
    }
    else {
        method = "PUT";
        url += '/' + doc._id;
    }
    var req = {
        type: method,
        url: url,
        data: JSON.stringify(doc),
        processData: false,
        contentType: 'application/json',
        expect_json: true
    };
    exports.request(req, callback);
};

/**
 * Deletes a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name removeDoc(doc, [options], callback)
 * @param {Object} doc
 * @param {Function} callback
 * @api public
 */

exports.removeDoc = function (doc, /*optional*/options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('removeDoc cannot be called server-side');
    }
    if (!doc._id) {
        throw new Error('removeDoc requires an _id field in your document');
    }
    if (!doc._rev) {
        throw new Error('removeDoc requires a _rev field in your document');
    }
    if (!callback) {
        /* Arity = 2: Omits options */
        callback = options;
        options = {};
    }
    var url;
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db + '/';
    } else {
        url = utils.getBaseURL() + '/_db/';
    }
    url += exports.encode(doc._id) + '?rev=' + exports.encode(doc._rev);
    var req = {
        type: 'DELETE',
        url: url
    };
    exports.request(req, callback);
};


/**
 * Fetches a view from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name getView(view, [q], callback)
 * @param {String} view
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

exports.getView = function (view, /*optional*/q, /*optional*/options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getView cannot be called server-side');
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
    var base;
    if (options.db) {
        /* Force leading slash; make absolute path */
        base = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        base = utils.getBaseURL();
    }
    var name = exports.encode(settings.name);
    var viewname = exports.encode(view);
    var req = {
        url: (
            base + (options.db ? '' : '/_db') +
                '/_design/' + (options.appName || options.db || name) +
                '/_view/' + viewname
        ),
        expect_json: true,
        use_cache: options.useCache,
        flush_cache: options.flushCache,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Transforms and fetches a view through a list from the database the app
 * is running on. Results are passed to the callback, with the first
 * argument of the callback reserved for any exceptions that occurred
 * (node.js style).
 *
 * @name getList(list, view, [q], callback)
 * @param {String} list
 * @param {String} view
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

// TODO: run list function client-side?
exports.getList = function (list, view, /*optional*/q, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getList cannot be called server-side');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    var base = utils.getBaseURL();
    var name = exports.encode(settings.name);
    var listname = exports.encode(list);
    var viewname = exports.encode(view);
    var req = {
        url: base + '/_db/_design/' + name + '/_list/' + listname +
             '/' + viewname,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};

/**
 * Transforms and fetches a document through a show from the database the app
 * is running on. Results are passed to the callback, with the first
 * argument of the callback reserved for any exceptions that occurred
 * (node.js style).
 *
 * @name getShow(show, docid, [q], callback)
 * @param {String} show
 * @param {String} docid
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

// TODO: run show function client-side?
exports.getShow = function (show, docid, /*optional*/q, callback) {
    if (!utils.isBrowser()) {
        throw new Error('getShow cannot be called server-side');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    var base = utils.getBaseURL();
    var name = exports.encode(settings.name);
    var showname = exports.encode(show);
    var show_url = base + '/_db/_design/' + name + '/_show/' + showname;
    var req = {
        url: show_url + (docid ? '/' + exports.encode(docid): ''),
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Get all documents (including design docs).
 *
 * @name all([q], callback)
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

exports.all = function (/*optional*/q, callback) {
    if (!utils.isBrowser()) {
        throw new Error('all cannot be called server-side');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    var base = utils.getBaseURL();
    var req = {
        url: base + '/_db/_all_docs',
        data: exports.stringifyQuery(q),
        expect_json: true
    };
    exports.request(req, callback);
};


/**
 * Properly encodes query parameters to CouchDB views etc. Handle complex
 * keys and other non-string parameters by passing through JSON.stringify.
 * Returns a shallow-copied clone of the original query after complex values
 * have been stringified.
 *
 * @name stringifyQuery(query)
 * @param {Object} query
 * @returns {Object}
 * @api public
 */

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


/**
 * Returns a new UUID generated by CouchDB. Its possible to cache
 * multiple UUIDs for later use, to avoid making too many requests.
 *
 * @name newUUID(cacheNum, callback)
 * @param {Number} cacheNum (optional, default: 1)
 * @param {Function} callback
 * @api public
 */

exports.newUUID = function (cacheNum, callback) {
    if (!utils.isBrowser()) {
        throw new Error('newUUID cannot be called server-side');
    }
    if (!callback) {
        callback = cacheNum;
        cacheNum = 1;
    }
    var req = {
        url: '/_uuids',
        use_cache: true,
        expect_json: true,
        data: { count: cacheNum }
    };

    /* Check cache; get reference to actual cache entry */
    var cache_search = exports._request_cache_fetch(req, false);

    if (cache_search) {
        var uuids = cache_search.response.uuids;
        if (uuids.length > 0) {
            /* Remove one uuid from cache, return it */
            return callback(null, uuids.shift());
        }
    }

    exports.request(req, function (err, response) {
        if (err) {
            return callback(err);
        }
        /* Get reference to cached version of response */
        var cache_entry = exports._request_cache_fetch(req, false);
        var uuids = ((cache_entry || {}).response || {}).uuids;

        if (uuids && uuids.length > 0) {

            /* Remove one uuid from cache:
                Because we asked _request_cache_fetch not to clone,
                our update here will affect the cache entry as well. */

            callback(null, uuids.shift());

        } else {

            /* Others requests got all of our uuids:
                Flush the cache entry to force a re-request,
                than go around and retry the request again. */

            exports._request_cache_remove(req);
            exports.newUUID(cacheNum, callback);
        }
    });
};

/**
 * Fetch a design document from CouchDB. By default, the
 * results of this function are cached within the javascript
 * engine. To avoid this, pass true for the no_cache argument.
 *
 * @name getDesignDoc(name, callback, no_cache)
 * @param name The name of (i.e. path to) the design document.
 * @param callback The callback to invoke when the request completes.
 * @param no_cache optional; true to force a cache miss for this request.
 * @api public
 */

exports.getDesignDoc = function (name, callback, no_cache) {
    var options = {
        use_cache: !no_cache,
        flush_cache: !!no_cache
    };
    exports.getDoc('_design/' + name, options, function (err, ddoc) {
        if (err) {
            return callback(err);
        }
        return callback(null, ddoc);
    });
};

/**
 * Creates a CouchDB database.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites for a PUT request to '/' and turn off safe rewrites.
 *
 * @name createDatabase(name, callback)
 * @param {String} name
 * @param {Function} callback
 * @api public
 */

exports.createDatabase = function (name, callback) {
    if (!utils.isBrowser()) {
        throw new Error('createDatabase cannot be called server-side');
    }
    var req = {
        type: 'PUT',
        url: '/' + exports.encode(name.replace(/^\/+/, ''))
    };
    exports.request(req, callback);
};

/**
 * Deletes a CouchDB database.
 *
 * If you're running behind a virtual host you'll need to set up
 * appropriate rewrites for a DELETE request to '/' and turn off safe rewrites.
 *
 * @name deleteDatabase(name, callback)
 * @param {String} name
 * @param {Function} callback
 * @api public
 */

// TODO: detect when 'name' argument is a url and don't construct a url then
exports.deleteDatabase = function (name, callback) {
    if (!utils.isBrowser()) {
        throw new Error('deleteDatabase cannot be called server-side');
    }
    var req = {
        type: 'DELETE',
        url: '/' + exports.encode(name.replace(/^\/+/, ''))
    };
    exports.request(req, callback);
};


/**
 * Gets information about the database.
 *
 * @name info([options], callback)
 * @param {Object} options (optional)
 * @param {Function} callback
 * @api public
 */

exports.info = function (/*optional*/options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('info cannot be called server-side');
    }
    if (!callback) {
        callback = options;
        options = {};
    }

    var url;
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }

    var req = {
        url: url,
        expect_json: true,
        use_cache: options.useCache,
        flush_cache: options.flushCache
    };
    exports.request(req, callback);
};


/**
 * Listen to the changes feed for a database.
 *
 * Options:
 * __db__ - the db url to use (defaults to current app's db)
 * __filter__ - the filter function to use
 * __since__ - the update_seq to start listening from
 * __heartbeat__ - the heartbeat time (defaults to 10 seconds)
 * __include_docs__ - whether to include docs in the results
 *
 * Returning false from the callback will cancel the changes listener
 *
 * @name changes([options], callback)
 * @param {Object} options (optional)
 * @param {Function} callback
 * @api public
 */

exports.changes = function (q, options, callback) {
    if (!utils.isBrowser()) {
        throw new Error('deleteDatabase cannot be called server-side');
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

    var url;
    if (options.db) {
        /* Force leading slash; make absolute path */
        url = (options.db.substr(0, 1) !== '/' ? '/' : '') + options.db;
    } else {
        url = utils.getBaseURL() + '/_db';
    }

    q = q || {};
    q.feed = 'longpoll';
    q.heartbeat = q.heartbeat || 10000;

    function getChanges(since) {
        q.since = since;
        var req = {
            type: 'GET',
            expect_json: true,
            url: url + '/_changes',
            data: exports.stringifyQuery(q)
        };
        var cb = function (err, data) {
            var result = callback.apply(this, arguments);
            if (result !== false) {
                getChanges(data.last_seq);
            }
        }
        exports.request(req, cb);
    }

    // use setTimeout to pass control back to the browser briefly to
    // allow the loading spinner to stop on page load
    setTimeout(function () {
        if (q.hasOwnProperty('since')) {
            getChanges(q.since);
        }
        else {
            var opts = {};
            if (options.db) {
                opts.db = db;
            }
            exports.info(opts, function (err, info) {
                if (err) {
                    return callback(err);
                }
                getChanges(info.update_seq);
            });
        }
    }, 0);
};
