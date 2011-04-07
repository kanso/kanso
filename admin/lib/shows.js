/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    admin_forms = require('./forms'),
    templates = require('kanso/templates');


var adminShow = function (fn) {
    return function (doc, req) {
        if (!req.client) {
            return templates.render('base.html', req, {
                title: 'Admin',
                content: templates.render('noscript.html', req, {})
            });
        }
        utils.getDesignDoc(req.query.app, function (err, ddoc) {
            if (err) {
                return alert(err);
            }
            fn(doc, ddoc, req);
        });
    }
};

exports.types = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings');
    var app = utils.appRequire(ddoc, settings.load);

    var types = [];
    if (app.types) {
        for (var k in app.types) {
            if (app.types.hasOwnProperty(k)) {
                types.push(k);
            }
        }
    }

    var res = {code: 200, headers: {'Content-Type': 'text/html'}};

    var content = templates.render('types.html', req, {
        types: types,
        app: settings.name,
        app_heading: utils.capitalize(settings.name)
    });

    if (req.client) {
        $('#content').html(content);
        document.title = settings.name + ' - Types';
    }
    else {
        res.body = templates.render('base.html', req, {
            title: settings.name + ' - Types',
            content: content
        });
    }

    return res;
});

exports.addtype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[req.query.type]: undefined;

    var forms = utils.appRequire(ddoc, 'kanso/forms'),
        form = new forms.Form(type);

    if (req.method === 'POST') {
        form.validate(req);
    }
    var content = templates.render('add_type.html', req, {
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type),
        form: form.toHTML(req, forms.render.table)
    });
    $('#content').html(content);
    document.title = settings.name + ' - Types - ' + req.query.type;
    admin_forms.bind(req);
});

exports.edittype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[req.query.type]: undefined;

    var forms = utils.appRequire(ddoc, 'kanso/forms'),
        form = new forms.Form(type, doc);

    var content = templates.render('edit_type.html', req, {
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type),
        id: req.query.id,
        form: form.toHTML(req, forms.render.table)
    });

    $('#content').html(content);
    document.title = settings.name + ' - Types - ' + req.query.type;
    admin_forms.bind(req);
});
