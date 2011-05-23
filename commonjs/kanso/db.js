/*global $: false, kanso: true */

/**
 * Contains functions for querying and storing data in CouchDB.
 */


/**
 * Module dependencies
 */

var utils = require('./utils'),
    settings = require('./settings');

var session = null;
// avoid making a circular require in CouchDB
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

function onComplete(callback) {
    return function (req) {
        var resp = httpData(req, "json");
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
 * Make a request, with some default settings and proper callback
 * handling. Used behind-the-scenes by most other DB module functions.
 *
 * @param {Object} options
 * @param {Function} callback
 */

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

// TODO: encode doc id in url
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
 * Saves a document to the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @param {Object} doc
 * @param {Function} callback
 */

// TODO: encode doc id in url
exports.saveDoc = function (doc, callback) {
    if (!utils.isBrowser) {
        throw new Error('saveDoc cannot be called server-side');
    }
    var method, url = utils.getBaseURL() + '/_db';
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
        contentType: 'application/json'
    };
    exports.request(req, callback);
};

/**
 * Deletes a document from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @param {Object} doc
 * @param {Function} callback
 */

exports.removeDoc = function (doc, callback) {
    if (!utils.isBrowser) {
        throw new Error('saveDoc cannot be called server-side');
    }
    var url = utils.getBaseURL() + '/_db/' +
        encodeURIComponent(doc._id) +
        '?rev=' + encodeURIComponent(doc._rev);

    exports.request({type: 'DELETE', url: url}, callback);
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

// TODO: make q argument optional?
exports.getView = function (view, q, callback) {
    if (!utils.isBrowser) {
        throw new Error('getView cannot be called server-side');
    }
    var base = utils.getBaseURL();
    var req = {
        url: base + '/_db/_design/' + settings.name + '/_view/' + view,
        data: exports.stringifyQuery(q)
    };
    exports.request(req, callback);
};


/**
 * Get all documents (including design docs).
 *
 * @param {Object} q (optional)
 * @param {Function} callback
 * @api public
 */

exports.all = function (/*optional*/q, callback) {
    if (!utils.isBrowser) {
        throw new Error('all cannot be called server-side');
    }
    if (!callback) {
        callback = q;
        q = {};
    }
    var base = utils.getBaseURL();
    var req = {
        url: base + '/_db/_all_docs',
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
 * @param {Number} cacheNum (optional, default: 1)
 * @param {Function} callback
 * @api public
 */

var uuidCache = [];

exports.newUUID = function (cacheNum, callback) {
    if (!utils.isBrowser) {
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
        data: {count: cacheNum}
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
 * Fetches the most recent revision of the replication document
 * referred to by the id parameter.
 *
 * @param {String} id
 * @param {Function} callback
 */

exports.getReplication = function (id, callback) {
    if (!utils.isBrowser) {
        throw new Error('getReplication cannot be called server-side');
    }
    var req = {
        url: '/_replicator/' + encodeURIComponent(id)
    };
    exports.request(req, callback);
};

/**
 * Replicates options.source to options.target. The strings 
 * options.source and options.target are each either a
 * CouchDB database name or a CouchDB database URI.
 *
 * @param {Object} options
 * @param {Function} callback
 */

exports.replicate = function (options, callback) {
    if (!utils.isBrowser) {
        throw new Error('replicate cannot be called server-side');
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
    exports.request(req, callback);
};

/**
 * Stops a replication operation already in progress.
 * The doc parameter can be obtained by calling getReplication.
 *
 * @param {String} id
 * @param {Function} callback
 */

exports.stopReplication = function (doc, callback, options) {

    if (!utils.isBrowser) {
        throw new Error('stopReplication cannot be called server-side');
    }

    if (!options) options = {};
    if (!options.limit) options.limit = 3;   /* times */
    if (!options.delay) options.delay = 500; /* ms */

    var req = {
        type: 'DELETE',
        url: '/_replicator/'
          + encodeURIComponent(doc._id)
          + '?rev=' + encodeURIComponent(doc._rev)
    };

    exports.request(req, function(err, rv) {

      if (/conflict/i.test(err)) {  /* HTTP 409: Document Update Conflict */

        /* Race condition:
            The CouchDB replication finished (or was updated) between
            the caller's getReplication and now. Subject to restrictions
            in the options object, call getReplication and then try again. */

        if (options.limit > 0) {
          options.limit -= 1;
          return exports.getReplication(doc._id, function(err_get, newdoc) {
            if (err_get) {
              throw new Error(
                'The specified replication document changed since our '
                  + 'last read, and stopReplication failed to re-request it'
              );
            }
            setTimeout(function() {
              return exports.stopReplication(newdoc, callback, options);
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

/**
 * Deletes an existing user document, given its username. You
 * must be logged in as an administrative user for this function
 * to succeed.
 *
 * @param {String} username
 * @param {Function} callback
 */

exports.deleteUser = function (username, callback) {
    var id = 'org.couchdb.user:' + username;

    exports.userDb(function (err, userdb) {
        if (err) {
            return callback(err);
        }
        var req = {
            type: 'DELETE',
            url: ('/' + userdb + '/' + id),
            data: doc,
            contentType: 'application/json'
        };
        db.request(req, callback);
    });
};

