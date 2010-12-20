var templates = require('templates');

exports.template = function (name, context) {
    var r = '';
    templates.render(name, context, function (err, result) {
      if (err) throw err;
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
    for (var i=0; i<matches.length; i++) {
        keys.push(matches[i].substr(1));
    };
    var groups = {};
    for (var i=0; i<keys.length; i++) {
        groups[keys[i]] = values[i];
    };
    return groups;
};

exports.matchURL = function (design_doc, url) {
    var rewrites = design_doc.rewrites;
    for (var i=0; i<rewrites.length; i++) {
        var r = rewrites[i];
        var re = new RegExp('^' + r.from.replace(/:\w+/, '([^/]+)') + '$');
        if (re.test(url)) return r;
    }
};

exports.handle = function (design_doc, url) {
    var match = exports.matchURL(design_doc, url);
    if (match) {
        var groups = exports.rewriteGroups(match.from, url);
        console.log(
            url + ' -> ' + JSON.stringify(match.to) + ' ' + JSON.stringify(groups)
        );
        var req = {query: groups};
        if ('_show/' === match.to.slice(0, 6)) {
            var src = design_doc.shows[match.to.slice(6)];
            // TODO: cache the eval'd fn
            var fn = eval('(' + src + ')');
            var doc = {};
            var client = true;
            fn(doc, req, client);
        }
        if ('_list/' === match.to.slice(0, 6)) {
            var src = design_doc.lists[match.to.slice(6)];
            // TODO: cache the eval'd fn
            var fn = eval('(' + src + ')');
            var head = {};
            var client = true;
            fn(head, req, client);
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
    else if('hash' in window.location) {
        window.location.hash = url;
    }
};

exports.getBaseURL = function () {
    var match = /(.*\/_rewrite).*$/.exec(window.location.pathname);
    if (match) {
        return match[1];
    }
    return '';
};

exports.getURL = function () {
    if (window.location.hash) {
        return window.location.hash.substr(1);
    }
    var match = /\/_rewrite(.*)$/.exec(window.location.pathname);
    if (match) {
        return match[1] || '/';
    }
    return window.location.pathname || '/';
};
