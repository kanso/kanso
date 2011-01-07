/*global window: true, getRow: true, start: true, $: true, kanso: true */
var templates = require('templates');


var isBrowser = false;
if (typeof window !== 'undefined') {
    isBrowser = true;
}

// create global functions
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


exports.requestBaseURL = function (req) {
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};

exports.template = function (name, req, context) {
    if (isBrowser) {
        context.baseURL = exports.getBaseURL(req);
    }
    else {
        context.baseURL = exports.requestBaseURL(req);
    }
    var r = '';
    templates.render(name, context, function (err, result) {
        if (err) {
            throw err;
        }
        r = result;
    });
    return r;
};

exports.rewriteGroups = function (pattern, url) {
    // TODO: add 'splats' as well as named params
    var re = new RegExp('^' + pattern.replace(/:\w+/, '([^/]+)') + '$');
    var m = re.exec(url);
    if (!m) {
        return [];
    }
    var values = m.slice(1);
    var keys = [];
    var matches = pattern.match(/:\w+/) || [];
    for (var i = 0; i < matches.length; i += 1) {
        keys.push(matches[i].substr(1));
    }
    var groups = {};
    for (var j = 0; j < keys.length; j += 1) {
        groups[keys[j]] = values[j];
    }
    return groups;
};

exports.matchURL = function (url) {
    var rewrites = kanso.design_doc.rewrites;
    for (var i = 0; i < rewrites.length; i += 1) {
        var r = rewrites[i];
        var re = new RegExp('^' + r.from.replace(/:\w+/, '([^/]+)') + '$');
        if (re.test(url)) {
            return r;
        }
    }
};

/**
 * replace group names in a string with the value of that group
 * eg: "/:name" with groups {name: 'test'} -> "/test"
 */

exports.replaceGroups = function (val, groups) {
    if (typeof val === 'string') {
        for (var k in groups) {
            if (val === ':' + k) {
                val = decodeURIComponent(groups[k]);
            }
        }
    }
    else if (val.length) {
        for (var k in groups) {
            for (var i = 0; i < val.length; i += 1) {
                if (val[i] === ':' + k) {
                    val[i] = decodeURIComponent(groups[k]);
                }
            }
        }
    }
    return val;
};

exports.replaceGroupsInPath = function (val, groups) {
    var parts = val.split('/');
    for (var i = 0; i < parts.length; i += 1) {
        for (var k in groups) {
            if (parts[i] === ':' + k) {
                parts[i] = decodeURIComponent(groups[k]);
            }
        }
    }
    return parts.join('/');
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
    var req = {
        query: query,
        headers: {},
        client: true,
        path: url.split('/')
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

exports.runShow = function (req, name, docid, callback) {
    var result;
    var src = kanso.design_doc.shows[name];
    // TODO: cache the eval'd fn
    var fn = eval('(' + src + ')');
    if (docid) {
        // TODO: handle errors!
        $.ajax({
            url: exports.getBaseURL() + '/_db/' + docid,
            dataType: 'json',
            data: exports.stringifyQuery(req.query),
            success: function (doc) {
                catchErr(fn, [doc, req], callback);
            }
        });
    }
    else {
        catchErr(fn, [null, req], callback);
    }
};

exports.runList = function (req, name, view, callback) {
    var src = kanso.design_doc.lists[name];
    // TODO: cache the eval'd fn
    var fn = eval('(' + src + ')');
    // TODO: implement proper lists api!
    var head = {};
    if (view) {
        var url = exports.getBaseURL() + '/_db/_design/' +
                  kanso.name + '/_view/' + view;
        // TODO: handle errors!
        $.ajax({
            url: url,
            dataType: 'json',
            data: exports.stringifyQuery(req.query),
            success: function (data) {
                getRow = function () {
                    return data.rows.shift();
                };
                catchErr(fn, [head, req], callback);
                getRow = function () {
                    return null;
                };
            }
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

        match.to = exports.replaceGroupsInPath(match.to, req.query);
        var msg = url + ' -> ' + JSON.stringify(match.to);
        msg += ' ' + JSON.stringify(req.query);
        console.log(msg);

        var parts = match.to.split('/');
        var src, fn, name;

        if (parts[0] === '_show') {
            exports.runShow(req, parts[1], parts[2]);
        }
        else if (parts[0] === '_list') {
            exports.runList(req, parts[1], parts[2]);
        }
        else {
            // TODO: decide what happens here
            alert('Unknown rewrite target: ' + match.to);
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

exports.getBaseURL = function () {
    var re = new RegExp('(.*\\/_rewrite).*$');
    var match = re.exec(window.location.pathname);
    if (match) {
        return match[1];
    }
    return '';
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
    var base = exports.getBaseURL();
    if (p.slice(0, base.length) === base) {
        return p.slice(base.length);
    }
    return p;
};
