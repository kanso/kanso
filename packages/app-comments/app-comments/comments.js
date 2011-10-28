var db = require('db'),
    templates = require('duality/templates'),
    datelib = require('datelib'),
    duality = require('duality/core'),
    settings = require('settings/root'),
    _ = require('underscore')._;


exports.get = function (target, /*optional*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    var startkey = [target];
    var endkey = [target, {}];
    if (options.descending) {
        startkey = [target, {}];
        endkey = [target];
    }
    var appdb = db.use(kanso_core.getDBURL());
    appdb.getView(settings.name, 'app-comments:comments_by_target',
        _.defaults(options, {
            limit: 100,
            startkey: startkey,
            endkey: endkey,
            descending: options.descending,
            include_docs: true
        }
    ), callback);
};

exports.getByUser = function (user, /*options*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    var startkey = [user];
    var endkey = [user, {}];
    if (options.descending) {
        startkey = [user, {}];
        endkey = [user];
    }
    var appdb = db.use(kanso_core.getDBURL());
    appdb.getView(settings.name, 'app-comments:comments_by_user',
        _.defaults(options, {
            limit: 100,
            startkey: startkey,
            endkey: endkey,
            descending: options.descending,
            include_docs: true
        }
    ), callback);
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
            monospace: options.monospace,
            no_comments: options.no_comments
        }));
        callback(null, data);
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
            monospace: options.monospace,
            no_comments: options.no_comments
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
    var appdb = db.use(kanso_core.getDBURL());
    appdb.saveDoc(doc, callback);
};

/**
 * Accepts a comments view result and returns a unique list of usernames
 */

exports.users = function (data) {
    return _.keys(_.reduce(data.rows, function (obj, row) {
        obj[row.doc.user] = null;
        return obj;
    }, {}));
};
