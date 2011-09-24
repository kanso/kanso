var db = require('kanso/db'),
    templates = require('kanso/templates'),
    datelib = require('datelib'),
    kanso_core = require('kanso/core'),
    _ = require('underscore')._;


exports.get = function (target, /*optional*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    db.getView('app-comments:comments_by_target', _.defaults(options, {
        limit: 100,
        descending: false,
        startkey: [target, {}],
        endkey: [target],
        descending: true,
        include_docs: true
    }), callback);
};

exports.getByUser = function (user, /*options*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    db.getView('app-comments:comments_by_user', _.defaults(options, {
        limit: 100,
        descending: false,
        startkey: [user, {}],
        endkey: [user],
        descending: true,
        include_docs: true
    }), callback);
};


exports.addToPage = function (req, target, /*optional*/options, callback) {
    if (!callback && _.isFunction(options)) {
        callback = options;
        options = {};
    }
    if (!callback) {
        callback = function () {};
    }
    if (!options) {
        options = {};
    }
    var el = options.container || $('#comments');
    exports.get(target, options, function (err, data) {
        if (err) {
            return callback(err);
        }
        var comments = _.map(data.rows, function (r) {
            r.doc.pptime = datelib.prettify(r.doc.time);
            if (options.user_link) {
                // TODO: actually use dustjs to render this as a template?
                var l = options.user_link.replace('{user}', r.doc.user);
                l = options.user_link.replace('{user|uc}', r.doc.user);
                l = l.replace('{baseURL}', kanso_core.getBaseURL());
                r.doc.user_link = l;
            }
            return r.doc;
        });
        el.html(templates.render('app-comments/comments.html', req, {
            comments: comments,
            monospace: options.monospace
        }));
        callback();
    });
};

exports.addUserCommentsToPage = function (req, user, /*opt*/options, callback) {
    if (!callback && _.isFunction(options)) {
        callback = options;
        options = {};
    }
    if (!callback) {
        callback = function () {};
    }
    if (!options) {
        options = {};
    }
    var el = options.container || $('#comments');
    exports.getByUser(user, options, function (err, data) {
        if (err) {
            return callback(err);
        }
        var comments = _.map(data.rows, function (r) {
            r.doc.pptime = datelib.prettify(r.doc.time);
            if (options.user_link) {
                // TODO: actually use dustjs to render this as a template?
                var l = options.user_link.replace('{user}', r.doc.user);
                l = l.replace('{user|uc}', r.doc.user);
                l = l.replace('{baseURL}', kanso_core.getBaseURL());
                r.doc.user_link = l;
            }
            if (options.target_link) {
                // TODO: actually use dustjs to render this as a template?
                var t = options.target_link.replace('{target}', r.doc.target);
                t = t.replace('{target|uc}', r.doc.target);
                t = t.replace('{baseURL}', kanso_core.getBaseURL());
                r.doc.target_link = t;
            }
            return r.doc;
        });
        el.html(templates.render('app-comments/user_comments.html', req, {
            comments: comments,
            monospace: options.monospace
        }));
        callback();
    });
};

exports.add = function (target, user, text, callback) {
    var doc = {
        type: 'app-comments:comment',
        target: target,
        user: user,
        text: text,
        time: datelib.ISODateString()
    }
    db.saveDoc(doc, callback);
};
