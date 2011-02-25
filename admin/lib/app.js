var templates = require('kanso/templates'),
    db = require('kanso/db'),
    util = require('./util');


exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/typelist/_design/:app'},
    {from: '/:app/:type', to: '_show/type/_design/:app'}
];

exports.views = {
    apps: {
        map: function (doc) {
            var id = doc._id;
            if (id !== '_design/admin' && id.substr(0, 8) === '_design/') {
                emit(id.substr(8), id);
            }
        }
    },
    types: {
        map: function (doc) {
            if (doc.type && doc._id.substr(0, 8) !== '_design/') {
                emit(doc.type, doc._id);
            }
        }
    }
};

exports.lists = {
    applist: function (head, req) {
        start({code: 200, headers: {'Content-Type': 'text/html'}});
        var row, rows = [];
        while (row = getRow()) {
            rows.push(row);
        }
        var content = templates.render('apps.html', req, {rows: rows});
        if (req.client) {
            $('#content').html(content);
            document.title = 'Apps';
        }
        else {
            return templates.render('base.html', req, {
                title: 'Apps',
                content: content
            });
        }
    }
};

exports.appRequire = function (ddoc, path) {
    return util.Couch.compileFunction('function () {\n' +
    '    return require("' + path + '");\n' +
    '}', ddoc)();
};

exports.shows = {
    typelist: function (doc, req) {
        var settings = exports.appRequire(doc, 'kanso/settings');
        var app = exports.appRequire(doc, settings.load);

        var types = [];
        if (app.types) {
            for (var k in app.types) {
                if (app.types.hasOwnProperty(k)) {
                    types.push(k);
                }
            }
        }

        var content = templates.render('types.html', req, {
            types: types,
            app: settings.name
        });

        if (req.client) {
            $('#content').html(content);
            document.title = settings.name + ' - Types';
        }
        else {
            return templates.render('base.html', req, {
                title: settings.name + ' - Types',
                content: content
            });
        }
    },
    type: function (doc, req) {
        var settings = exports.appRequire(doc, 'kanso/settings');
        var app = exports.appRequire(doc, settings.load);
        var type = app.types ? app.types[req.query.type]: undefined;

        var forms = exports.appRequire(doc, 'kanso/forms');
        var form = new forms.Form(type);
        if (req.method === 'POST') {
            form.validate(req);
        }
        var content = templates.render('add_type.html', req, {
            app: req.query.app,
            type: req.query.type,
            form: form.toHTML()
        });

        if (req.client) {
            $('#content').html(content);
            document.title = settings.name + ' - Types - ' + req.query.type;
        }
        else {
            return templates.render('base.html', req, {
                title: settings.name + ' - Types - ' + req.query.type,
                content: content
            });
        }
    }
};
