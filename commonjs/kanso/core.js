/*global window: false, getRow: true, start: true, $: false, pageTracker: true,
  kanso: true */

/**
 * Module dependencies
 */

var settings = require('./settings'), // module auto-generated
    url = require('./url'),
    db = require('./db'),
    utils = require('./utils'),
    session = require('./session'),
    urlParse = url.parse,
    urlFormat = url.format;


/**
 * Some functions calculate results differently depending on the execution
 * environment. The isBrowser value is used to set the correct environment
 * for these functions, and is only exported to make unit testing easier.
 *
 * You should not need to change this value during normal usage.
 *
 * This was moved to utils to avoid a circular dependency between
 * core.js and db.js... however, it should be accessed via the core.js module
 * as it may get moved back once circular dependencies are fixed in couchdb's
 * commonjs implementation.
 */

exports.isBrowser = utils.isBrowser;


/**
 * This is because the first page hit also triggers kanso to handle the url
 * client-side. Knowing it is the first page being loaded means we can stop
 * the pageTracker code from submitting the URL twice. Exported because this
 * might be useful information to other modules, it should not be modified
 * by them.
 */

exports.initial_hit = true;


/**
 * Global functions required to match the CouchDB JavaScript environment.
 */

if (typeof getRow === 'undefined' && typeof window !== 'undefined') {
    window.getRow = function () {
        return null;
    };
}
if (typeof start === 'undefined' && typeof window !== 'undefined') {
    window.start = function (options) {
        console.log('start: ' + JSON.stringify(options));
    };
}


/**
 * The module loaded as the design document (load property in kanso.json).
 * Likely to cause circular require in couchdb so only run browser side.
 * TODO: when circular requires are fixed in couchdb, remove the isBrowser check
 */

if (utils.isBrowser) {
    exports.app = {};
    if (settings.load) {
        exports.app = require(settings.load);
    }
}


/**
 * Called by kanso.js once the design doc has been loaded.
 */

exports.init = function () {

    if (!window.console) {
        // console.log is going to cause errors, just stub the functions
        // for now. TODO: add logging utility for IE?
        window.console = {
            log: function () {},
            error: function () {},
            info: function () {},
            warn: function () {}
        };
    }

    $('form').live('submit', function (ev) {
        var action = $(this).attr('action') || exports.getURL();
        var method = $(this).attr('method').toUpperCase();

        if (exports.isAppURL(action)) {
            var url = exports.appPath(action);
            ev.preventDefault();
            var fields = $(this).serializeArray();
            var data = {};
            for (var i = 0; i < fields.length; i += 1) {
                data[fields[i].name] = fields[i].value;
            }
            exports.setURL(method, url, data);
        }
    });

    $('a').live('click', function (ev) {
        var href = $(this).attr('href');

        if (exports.isAppURL(href)) {
            var url = exports.appPath(href);
            ev.preventDefault();
            exports.setURL('GET', url);
        }
    });

    window.History.Adapter.bind(window, 'statechange', function (ev) {
        var url = exports.getURL();
        var state_data = window.History.getState().data;
        var method = state_data.method || 'GET';
        var data = state_data.data;
        exports.handle(method, url, data);
    });

    // call init on app too
    if (exports.app.init) {
        exports.app.init();
    }
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

// TODO actually match based on method
exports.matchURL = function (method, url) {
    var pathname = urlParse(url).pathname;
    var rewrites = kanso.app.rewrites;
    for (var i = 0; i < rewrites.length; i += 1) {
        var r = rewrites[i];
        if (!r.method || method === r.method) {
            var from = r.from;
            from = from.replace(/\*$/, '(.*)');
            from = from.replace(/:\w+/g, '([^/]+)');
            var re = new RegExp('^' + from + '$');
            if (re.test(pathname)) {
                return r;
            }
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

exports.createRequest = function (method, url, data, match) {
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
        method: method,
        query: query,
        headers: {},
        path: to.split('/'),
        client: true,
        initial_hit: exports.initial_hit
    };
    if (data) {
        req.form = data;
    }
    return req;
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
    var fn = kanso.app.shows[name];
    if (docid) {
        db.getDoc(docid, req.query, function (err, doc) {
            if (err) {
                return callback(err);
            }
            fn(doc, req);
            callback();
        });
    }
    else {
        fn(null, req);
        callback();
    }
};


exports.runUpdate = function (req, name, docid, callback) {
    var result;
    var fn = kanso.app.updates[name];
    if (docid) {
        db.getDoc(docid, req.query, function (err, doc) {
            if (err) {
                return callback(err);
            }
            fn(doc, req);
            callback();
        });
    }
    else {
        fn(null, req);
        callback();
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
    var fn = kanso.app.lists[name];
    if (view) {
        // update_seq used in head parameter passed to list function
        req.query.update_seq = true;
        db.getView(view, req.query, function (err, data) {
            if (err) {
                return callback(err);
            }
            getRow = function () {
                return data.rows.shift();
            };
            var head = exports.createHead(data);
            fn(head, req);
            getRow = function () {
                return null;
            };
            callback();
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
exports.handle = function (method, url, data) {
    // TODO: actually match based on method
    var match = exports.matchURL(method, url);
    if (match) {
        var parsed = urlParse(url),
            req = exports.createRequest(method, url, data, match);

        var msg = method + ' ' + url + ' -> ' +
            JSON.stringify(req.path.join('/')) + ' ' +
            JSON.stringify(req.query);

        console.log(msg);

        var after = function () {
            if (parsed.hash) {
                // we have to handle in-page anchors manually because we've
                // hijacked the hash part of the url
                // TODO: don't re-handle the page if only the hash has changed

                // test if a valid element name or id
                if (/#[A-Za-z_\-:\.]+/.test(parsed.hash)) {
                    var el = $(parsed.hash);
                    if (el.length) {
                        window.scrollTo(0, el.offset().top);
                    }
                }
                else if (parsed.hash === '#') {
                    // scroll to top of page
                    window.scrollTo(0, 0);
                }
                // TODO: handle invalid values?
            }
        };

        var src, fn, name;

        if (req.path[0] === '_show') {
            exports.runShow(
                req, req.path[1], req.path.slice(2).join('/'), after
            );
        }
        else if (req.path[0] === '_list') {
            exports.runList(
                req, req.path[1], req.path.slice(2).join('/'), after
            );
        }
        else if (req.path[0] === '_update') {
            exports.runUpdate(
                req, req.path[1], req.path.slice(2).join('/'), after
            );
        }
        else {
            // TODO: decide what happens here
            //alert('Unknown rewrite target: ' + req.path.join('/'));
            console.log('Unknown rewrite target: ' + req.path.join('/'));
            var newurl = exports.getBaseURL() + '/_db/_design/' +
                settings.name + '/' + req.path.join('/');
            console.log('redirecting to: ' + newurl);
            window.location = newurl;
        }
    }
    else {
        console.log(method + ' ' + url + ' -> [404]');
        alert('404');
        // TODO: render a standard 404 template?
    }

    /**
     * if google analytics is included on the page, and this url
     * has not been tracked (not the initial hit) then manually
     * track a page view. This is done consistently for hash-based
     * and pushState urls
     */
    if (window.pageTracker && !exports.initial_hit) {
        pageTracker._trackPageview(url);
    }
    exports.initial_hit = false;
};


/**
 * If pushState is supported, add an entry for the given url, prefixed with
 * the baseURL for the app.
 *
 * @param {String} url
 */

// TODO: add unit tests for this function
exports.setURL = function (method, url, data) {
    var fullurl = exports.getBaseURL() + url;
    window.History.pushState({
        method: method,
        data: data
    }, document.title, fullurl);
};


/**
 * This was moved to utils to avoid a circular dependency between
 * core.js and db.js... however, it should be accessed via the core.js module
 * as it may get moved back once circular dependencies are fixed in couchdb's
 * commonjs implementation.
 */

exports.getBaseURL = utils.getBaseURL;


/**
 * Gets the current app-level URL (without baseURL prefix).
 *
 * @returns {String}
 * @api public
 */

exports.getURL = function () {
    var re = new RegExp('\\/_rewrite(.*)$');

    var History_url = window.History.getState().url;
        parts = /(.*)\/uid=([0-9]+)$/.exec(History_url),
        url = parts ? (parts[1]||History_url) : History_url;

    var loc = urlParse(url),
        match = re.exec(loc.pathname);

    if (match) {
        var url = {pathname: match[1] || '/'};
        if (loc.search) {
            url.search = loc.search;
        }
        return urlFormat(url) || '/';
    }
    return loc.pathname || '/';
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
    // hash links need current URL prepending
    if (p.charAt(0) === '#') {
        var newurl = urlParse(exports.getURL());
        newurl.hash = p;
        return exports.appPath(urlFormat(newurl));
    }
    if (/\w+:/.test(p)) {
        // include protocol
        var origin = p.split('/').slice(0, 3).join('/');
        // coerce window.location to a real string so we can use split in IE
        var loc = '' + window.History.getState().url;
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
    return exports.sameOrigin(url, '' + window.History.getState().url);
};

