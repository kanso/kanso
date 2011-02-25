var utils = require('./utils'),
    templates = require('kanso/templates');


exports.types = function (doc, req) {
    var settings = utils.appRequire(doc, 'kanso/settings');
    var app = utils.appRequire(doc, settings.load);

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
};

exports.addtype = function (doc, req) {
    var settings = utils.appRequire(doc, 'kanso/settings');
    var app = utils.appRequire(doc, settings.load);
    var type = app.types ? app.types[req.query.type]: undefined;

    var forms = utils.appRequire(doc, 'kanso/forms');
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
};
