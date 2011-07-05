/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing data in CouchDB.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('./utils'),
    settings = require('./settings'),
    session = null;

/* Avoid a circular require in CouchDB */

if (utils.isBrowser) {
    session = require('./session');
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
 * Cache for design documents fetched via getDesignDoc.
 */

exports.design_docs = {};


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
                return callback(e);
            }
        }
        else {
            if (options.expect_json) {
                return callback(
                    new Error('Expected JSON response, got ' + ctype)
                );
            }
            resp = req.responseText;
        }
        if (req.status === 401) {
            // returned 'Unauthorized', check the user's session if it's not
            // been checked on an 'Unauthorized' repsonse in the last second
            if (session && last_session_check < new Date().getTime() - 1000) {
                session.info();
            }
        }
        if (req.status === 200 || req.status === 201 || req.status === 202) {
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
 * Make a request, with some default settings and proper callback
 * handling. Used behind-the-scenes by most other DB module functions.
 *
 * @name request(options, callback)
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.request = function (options, callback) {
    options.complete = onComplete(options, callback);
    options.dataType = 'json';
    $.ajax(options);
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
        data: exports.stringifyQuery(q),
        expect_json: true
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
        data: exports.stringifyQuery(q),
        expect_json: true
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

var uuidCache = [];

exports.newUUID = function (cacheNum, callback) {
    if (!utils.isBrowser()) {
        throw new Error('newUUID cannot be called server-side');
    }
    if (!callback) {
        callback = cacheNum;
        cacheNum = 1;
    }
    if (uuidCache.length) {
        return callback(null, uuidCache.shift());
    }
    var base = utils.getBaseURL();
    var req = {
        url: '/_uuids',
        data: {count: cacheNum},
        expect_json: true
    };
    exports.request(req, function (err, resp) {
        if (err) {
            return callback(err);
        }
        uuidCache = resp.uuids;
        callback(null, uuidCache.shift());
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
    if (!no_cache && exports.design_docs[name]) {
        return callback(null, exports.design_docs[name]);
    }
    exports.getDoc('_design/' + name, {}, function (err, ddoc) {
        if (err) {
            return callback(err);
        }
        exports.design_docs[name] = ddoc;
        return callback(null, exports.design_docs[name]);
    });
};

