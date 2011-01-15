/*global window: true, getRow: true, start: true, $: true, kanso: true */

/**
 * Module dependencies
 */

var templates = require('./templates'), // templates module auto-generated
    url = require('./url'),
    urlParse = url.parse,
    urlFormat = url.format;


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 *
 * You should not need to change this value during normal usage.
 */

exports.isBrowser = false;
if (typeof window !== 'undefined') {
    exports.isBrowser = true;
}


/**
 * Global functions required to match the CouchDB JavaScript environment.
 */

if (typeof getRow === 'undefined') {
    this.getRow = function () {
        return null;
    };
}
if (typeof start === 'undefined') {
    this.start = function (options) {
        console.log('start: ' + JSON.stringify(options));
    };
}


/**
 * Synchronously render dust template and return result, automatically adding
 * baseURL to the template's context. The request object is required so we
 * can determine the value of baseURL.
 *
 * @param {String} name
 * @param {Object} req
 * @param {Object} context
 * @return {String}
 * @api public
 */

// TODO: add unit tests for this function
exports.template = function (name, req, context) {
    context.baseURL = exports.getBaseURL(req);
    var r = '';
    templates.render(name, context, function (err, result) {
        if (err) {
            throw err;
        }
        r = result;
    });
    return r;
};


/**
 * Extracts groups from a url, eg:
 * '/some/path' with pattern '/some/:name' -> {name: 'path'}
 *
 * @param {String} pattern
 * @param {String} url
 * @returns {Object}
 */

exports.rewriteGroups = function (pattern, url) {
    var pathname = urlParse(url).pathname;
    var re = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
    var m = re.exec(pathname);
    if (!m) {
        return [];
    }
    var values = m.slice(1);
    var keys = [];
    var matches = pattern.match(/:\w+/g) || [];
    for (var i = 0; i < matches.length; i += 1) {
        keys.push(matches[i].substr(1));
    }
    var groups = {};
    for (var j = 0; j < keys.length; j += 1) {
        groups[keys[j]] = values[j];
    }
    return groups;
};

/**
 * Extracts a splat value from a rewrite pattern and matching URL.
 *
 * @param {String} pattern
 * @param {String} url
 * @returns {String}
 */

exports.rewriteSplat = function (pattern, url) {
    // splats are only supported at the end of a rewrite pattern
    if (pattern.charAt(pattern.length - 1) === '*') {
        var re = new RegExp(pattern.substr(0, pattern.length - 1) + '(.*)');
        var match = re.exec(url);
        if (match) {
            return match[1];
        }
    }
};


/**
 * Attempts to match rewrite from patterns to a URL, returning the
 * matching rewrite object if successful.
 *
 * @param {String} url
 * @return {Object}
 */

exports.matchURL = function (url) {
    var pathname = urlParse(url).pathname;
    var rewrites = kanso.design_doc.rewrites;
    for (var i = 0; i < rewrites.length; i += 1) {
        var r = rewrites[i];
        var from = r.from;
        from = from.replace(/\*$/, '(.*)');
        from = from.replace(/:\w+/g, '([^/]+)');
        var re = new RegExp('^' + from + '$');
        if (re.test(pathname)) {
            return r;
        }
    }
};

/**
 * Replace group names in a string with the value of that group
 * eg: "/:name" with groups {name: 'test'} -> "/test"
 *
 * @param {String} val
 * @param {Object} groups
 * @returns {String}
 */

exports.replaceGroups = function (val, groups, splat) {
    var k, match, result = val;

    if (typeof val === 'string') {
        result = val.split('/');
        for (var i = 0; i < result.length; i += 1) {
            match = false;
            for (k in groups) {
                if (result[i] === ':' + k) {
                    result[i] = decodeURIComponent(groups[k]);
                    match = true;
                }
            }
            if (!match && result[i] === '*') {
                result[i] = splat;
            }
        }
        result = result.join('/');
    }
    else if (val.length) {
        result = val.slice();
        for (var j = 0; j < val.length; j += 1) {
            match = false;
            for (k in groups) {
                if (val[j] === ':' + k) {
                    result[j] = decodeURIComponent(groups[k]);
                    match = true;
                }
            }
            if (!match && val[j] === '*') {
                result[j] = splat;
            }
        }
    }
    return result;
};


/**
 * Creates a new request object from a url and matching rewrite object.
 * Query parameters are automatically populated from rewrite pattern.
 *
 * @param {String} url
 * @param {Object} match
 * @returns {Object}
 */

 // TODO: parse query params from the url and add to req.query
exports.createRequest = function (url, match) {
    var groups = exports.rewriteGroups(match.from, url);
    var query = urlParse(url, true).query || {};
    var k;
    if (match.query) {
        for (k in match.query) {
            if (match.query.hasOwnProperty(k)) {
                query[k] = exports.replaceGroups(match.query[k], groups);
            }
        }
    }
    if (groups) {
        for (k in groups) {
            if (groups.hasOwnProperty(k)) {
                query[k] = decodeURIComponent(groups[k]);
            }
        }
    }
    // splats are available for rewriting match.to, but not accessible on
    // the request object (couchdb 1.1.x), storing in a separate variable
    // for now
    var splat = exports.rewriteSplat(match.from, url);
    var to = exports.replaceGroups(match.to, query, splat);

    var req = {
        query: query,
        headers: {},
        client: true,
        path: to.split('/')
    };
    return req;
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


/**
 * If callback is present catch errors and pass to callback, otherwise
 * re-throw errors.
 *
 * @param {Function} fn
 * @param {Array} args
 * @param {Function} callback
 */

// TODO: add unit tests for this function
function catchErr(fn, args, /*optional*/callback) {
    try {
        var result = fn.apply(null, args);
        if (callback) {
            callback(null, result);
        }
        return result;
    }
    catch (e) {
        if (callback) {
            callback(e);
        }
        else {
            throw e;
        }
    }
}


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
    if (!exports.isBrowser) {
        throw new Error('getDoc cannot be called server-side');
    }
    $.ajax({
        url: exports.getBaseURL() + '/_db/' + id,
        dataType: 'json',
        data: exports.stringifyQuery(q),
        success: function (doc) {
            callback(null, doc);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            callback(errorThrown || new Error(textStatus));
        }
    });
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
    if (!exports.isBrowser) {
        throw new Error('getView cannot be called server-side');
    }
    var base = exports.getBaseURL();
    $.ajax({
        url: base + '/_db/_design/' + kanso.name + '/_view/' + view,
        dataType: 'json',
        data: exports.stringifyQuery(q),
        success: function (doc) {
            callback(null, doc);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            callback(errorThrown || new Error(textStatus));
        }
    });
};


/**
 * Evaluates a show function, then fetches the relevant document and calls
 * the show function with the result.
 *
 * @param {Object} req
 * @param {String} name
 * @param {String} docid
 * @param {Function} callback
 */

// TODO: add unit tests for this function
exports.runShow = function (req, name, docid, callback) {
    var result;
    var src = kanso.design_doc.shows[name];
    // TODO: cache the eval'd fn
    var fn;
    eval('fn = (' + src + ')');
    if (docid) {
        exports.getDoc(docid, req.query, function (err, doc) {
            if (err) {
                return callback(err);
            }
            catchErr(fn, [doc, req], callback);
        });
    }
    else {
        catchErr(fn, [null, req], callback);
    }
};


/**
 * Creates a head object for passing to a list function from the results
 * of a view.
 */

exports.createHead = function (data) {
    var head = {};
    for (var k in data) {
        if (k !== 'rows') {
            head[k] = data[k];
        }
    }
    return head;
};


/**
 * Evaluates a list function, then fetches the relevant view and calls
 * the list function with the result.
 *
 * @param {Object} req
 * @param {String} name
 * @param {String} view
 * @param {Function} callback
 */

// TODO: add unit tests for this function
exports.runList = function (req, name, view, callback) {
    var src = kanso.design_doc.lists[name];
    // TODO: cache the eval'd fn
    var fn;
    eval('fn = (' + src + ')');
    if (view) {
        // update_seq used in head parameter passed to list function
        req.query.update_seq = true;
        exports.getView(view, req.query, function (err, data) {
            if (err) {
                return callback(err);
            }
            getRow = function () {
                return data.rows.shift();
            };
            var head = exports.createHead(data);
            catchErr(fn, [head, req], callback);
            getRow = function () {
                return null;
            };
        });
    }
    // TODO: check if it should throw here
    else {
        var e = new Error('no view specified');
        if (callback) {
            callback(e);
        }
        else {
            throw e;
        }
    }
};


/**
 * Creates a request object for the url and runs appropriate show or list
 * functions.
 *
 * @param {String} url
 */

// TODO: add unit tests for this function
exports.handle = function (url) {
    var match = exports.matchURL(url);
    if (match) {
        var req = exports.createRequest(url, match);
        var msg = url + ' -> ' + JSON.stringify(req.path.join('/'));
        msg += ' ' + JSON.stringify(req.query);
        console.log(msg);

        var src, fn, name;

        if (req.path[0] === '_show') {
            exports.runShow(req, req.path[1], req.path[2]);
        }
        else if (req.path[0] === '_list') {
            exports.runList(req, req.path[1], req.path[2]);
        }
        else {
            // TODO: decide what happens here
            alert('Unknown rewrite target: ' + req.path.join('/'));
        }
    }
    else {
        console.log(url);
        alert('404');
        // TODO: render a standard 404 template?
    }
};


/**
 * If pushState is supported, add an entry for the given url, prefixed with
 * the baseURL for the app.
 *
 * @param {String} url
 */

// TODO: add unit tests for this function
exports.setURL = function (url) {
    if (window.history.pushState) {
        var fullurl  = exports.getBaseURL() + url;
        window.history.pushState({}, document.title, fullurl);
    }
    // this is now set *before* handling as it trigger an onhashchange event
    /*else if ('hash' in window.location) {
        window.location.hash = url;
    }*/
};


/**
 * Returns the path to prefix to any URLs. When running behind a
 * virtual host, there is nothing to prefix URLs with. When accessing the
 * app directly, URLs need to be prefixed with /db/_design/appname/_rewrite.
 *
 * The request object argument is only required when run server-side.
 *
 * @param {Object} req
 * @returns {String}
 * @api public
 */

exports.getBaseURL = function (req) {
    if (exports.isBrowser) {
        var re = new RegExp('(.*\\/_rewrite).*$');
        var match = re.exec(window.location.pathname);
        if (match) {
            return match[1];
        }
        return '';
    }
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};


/**
 * Gets the current app-level URL (without baseURL prefix).
 *
 * @returns {String}
 * @api public
 */

exports.getURL = function () {
    if (window.location.hash) {
        return decodeURIComponent(window.location.hash.substr(1)) || '/';
    }
    var re = new RegExp('\\/_rewrite(.*)$');
    var loc = urlParse('' + window.location);
    var match = re.exec(loc.pathname);
    if (match) {
        var url = {pathname: match[1] || '/'};
        if (window.location.search) {
            url.search = window.location.search;
        }
        return urlFormat(url) || '/';
    }
    return window.location.pathname || '/';
};

/**
 * Tests is two urls are of the same origin. Accepts parsed url objects
 * or strings as arguments.
 */

// TODO: add unit tests for this function
exports.sameOrigin = function (a, b) {
    var ap = (typeof a === 'string') ? urlParse(a): a;
    var bp = (typeof b === 'string') ? urlParse(b): b;
    // if one url is relative to current origin, return true
    if (ap.protocol === undefined || bp.protocol === undefined) {
        return true;
    }
    return (
        ap.protocol === bp.protocol &&
        ap.hostname === bp.hostname &&
        ap.port === bp.port
    );
};

/**
 * Converts a full url to an app-level url (without baseURL prefix).
 * example: {baseURL}/some/path -> /some/path
 *
 * @param {String} p
 * @returns {String}
 */

// TODO: add unit tests for this function
exports.appPath = function (p) {
    if (/\w+:/.test(p)) {
        // include protocol
        var origin = p.split('/').slice(0, 3).join('/');
        // coerce window.location to a real string so we can use split in IE
        var loc = '' + window.location;
        if (origin === loc.split('/').slice(0, 3).join('/')) {
            // remove origin, set p to pathname only
            // IE often adds this to a tags, hence why we strip it out now
            p = p.substr(origin.length);
        }
        else {
            // not same origin, return original full path
            return p;
        }
    }
    var base = exports.getBaseURL();
    // TODO: should this be substr not slice?
    if (p.slice(0, base.length) === base) {
        // TODO: should this be substr not slice?
        return p.slice(base.length);
    }
    return p;
};


/**
 * Used to decide whether to handle a link or not. Should detect app vs.
 * external urls.
 *
 * @param {String} url
 * @return {Boolean}
 */

exports.isAppURL = function (url) {
    // coerce window.location to a real string in IE
    return exports.sameOrigin(url, '' + window.location);
};

