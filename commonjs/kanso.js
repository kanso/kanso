/*global window: true, getRow: true, start: true, $: true, kanso: true */

var templates = require('templates');


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
    var re = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
    var m = re.exec(url);
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
    var rewrites = kanso.design_doc.rewrites;
    for (var i = 0; i < rewrites.length; i += 1) {
        var r = rewrites[i];
        var from = r.from;
        from = from.replace(/\*$/, '(.*)');
        from = from.replace(/:\w+/g, '([^/]+)')
        var re = new RegExp('^' + from + '$');
        if (re.test(url)) {
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
    var k, result = val;
    if (typeof val === 'string') {
        result = val.split('/');
        for (var i = 0; i < result.length; i += 1) {
            var match = false;
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
        for (var i = 0; i < val.length; i += 1) {
            var match = false;
            for (k in groups) {
                if (val[i] === ':' + k) {
                    result[i] = decodeURIComponent(groups[k]);
                    match = true;
                }
            }
            if (!match && val[i] === '*') {
                result[i] = splat;
            }
        }
    }
    return result;
};

exports.createRequest = function (url, match) {
    var groups = exports.rewriteGroups(match.from, url);
    var query = {};
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
 * if callback is present catch errors and pass to callback, otherwise
 * re-throw errors.
 */
function catchErr(fn, args, callback) {
    try {
        var result = fn.apply(null, args);
        if (callback) {
            callback(null, result);
        }
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

exports.runShow = function (req, name, docid, callback) {
    var result;
    var src = kanso.design_doc.shows[name];
    // TODO: cache the eval'd fn
    eval('var fn = (' + src + ')');
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

exports.runList = function (req, name, view, callback) {
    var src = kanso.design_doc.lists[name];
    // TODO: cache the eval'd fn
    eval('var fn = (' + src + ')');
    // TODO: implement proper lists api!
    var head = {};
    if (view) {
        exports.getView(view, req.query, function (err, data) {
            if (err) {
                return callback(err);
            }
            getRow = function () {
                return data.rows.shift();
            };
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

exports.setURL = function (url) {
    if (window.history.pushState) {
        var fullurl  = exports.getBaseURL() + url;
        window.history.pushState({}, window.title, fullurl);
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

exports.getURL = function () {
    if (window.location.hash) {
        return window.location.hash.substr(1);
    }
    var re = new RegExp('\\/_rewrite(.*)$');
    var match = re.exec(window.location.pathname);
    if (match) {
        return match[1] || '/';
    }
    return window.location.pathname || '/';
};

/**
 * Converts {baseURL}/some/path to /some/path
 */

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
    if (p.slice(0, base.length) === base) {
        return p.slice(base.length);
    }
    return p;
};
