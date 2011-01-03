/*global window: true */
var templates = require('templates');

exports.requestBaseURL = function (req) {
    if (req.headers['x-couchdb-vhost-path']) {
        return '';
    }
    return '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
};

exports.template = function (req, name, context) {
    context.baseURL = exports.requestBaseURL(req);
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

exports.matchURL = function (design_doc, url) {
    var rewrites = design_doc.rewrites;
    for (var i = 0; i < rewrites.length; i += 1) {
        var r = rewrites[i];
        var re = new RegExp('^' + r.from.replace(/:\w+/, '([^/]+)') + '$');
        if (re.test(url)) {
            return r;
        }
    }
};

exports.handle = function (design_doc, url) {
    var match = exports.matchURL(design_doc, url);
    if (match) {
        var groups = exports.rewriteGroups(match.from, url);

        var msg = url + ' -> ' + JSON.stringify(match.to);
        msg += ' ' + JSON.stringify(groups);
        console.log(msg);

        var req = {query: groups, client: true};
        var src, fn;

        if ('_show/' === match.to.slice(0, 6)) {
            src = design_doc.shows[match.to.slice(6)];
            // TODO: cache the eval'd fn
            fn = eval('(' + src + ')');
            var doc = {};
            fn(doc, req);
        }
        else if ('_list/' === match.to.slice(0, 6)) {
            src = design_doc.lists[match.to.slice(6)];
            // TODO: cache the eval'd fn
            fn = eval('(' + src + ')');
            var head = {};
            fn(head, req);
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
    else if ('hash' in window.location) {
        window.location.hash = url;
    }
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
