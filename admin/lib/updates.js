/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    core = require('kanso/core'),
    templates = require('kanso/templates'),
    db = require('kanso/db'),
    flashmessages = require('kanso/flashmessages');


exports.addtype = function (doc, req) {
    if (!req.client) {
        return [null, templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + req.query.type,
            content: templates.render('noscript.html', req, {})
        })];
    }
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            types = utils.appRequire(ddoc, 'kanso/types'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[req.query.type]: undefined;

        var forms = utils.appRequire(ddoc, 'kanso/forms'),
            form = new forms.Form(type);

        form.validate(req);

        if (form.isValid()) {
            types.validate_doc_update(app.types, form.values, null, req.userCtx);
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    flashmessages.addMessage(req, {
                        type: 'error',
                        message: err.toString()
                    });

                    var content = templates.render('add_type.html', req, {
                        app: req.query.app,
                        app_heading: utils.capitalize(req.query.app),
                        type: req.query.type,
                        type_heading: utils.typeHeading(req.query.type),
                        form: form.toHTML(req, forms.render.table)
                    });

                    $('#content').html(content);
                    document.title = settings.name + ' - Types - ' + req.query.type;
                }
                else {
                    flashmessages.addMessage(req, {
                        type: 'success',
                        message: 'Added ' + resp.id
                    });
                    core.setURL('GET', '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id);
                }
            });
        }
        else {
            flashmessages.addMessage(req, {
                type: 'error',
                message: 'Please correct the indicated errors'
            });

            var content = templates.render('add_type.html', req, {
                app: req.query.app,
                app_heading: utils.capitalize(req.query.app),
                type: req.query.type,
                type_heading: utils.typeHeading(req.query.type),
                form: form.toHTML(req, forms.render.table)
            });

            $('#content').html(content);
            document.title = settings.name + ' - Types - ' + req.query.type;
        }
        $('form').bindKansoForm(req);
    });
};

exports.updatetype = function (doc, req) {
    if (!req.client) {
        return [null, templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + req.query.type,
            content: templates.render('noscript.html', req, {})
        })];
    }
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[req.query.type]: undefined;

        var forms = utils.appRequire(ddoc, 'kanso/forms'),
            form = new forms.Form(type);

        form.validate(req);

        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    flashmessages.addMessage(req, {
                        type: 'error',
                        message: err.toString()
                    });

                    var content = templates.render('edit_type.html', req, {
                        id: req.query.id,
                        app: req.query.app,
                        app_heading: utils.capitalize(req.query.app),
                        type: req.query.type,
                        type_heading: utils.typeHeading(req.query.type),
                        form: form.toHTML(req, forms.render.table)
                    });

                    $('#content').html(content);
                    document.title = settings.name + ' - Types - ' + req.query.type;
                }
                else {
                    flashmessages.addMessage(req, {
                        type: 'success',
                        message: 'Saved changes to ' + doc._id
                    });
                    core.setURL('GET', '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id);
                }
            });
        }
        else {
            flashmessages.addMessage(req, {
                type: 'error',
                message: 'Please correct the indicated errors'
            });

            var content = templates.render('edit_type.html', req, {
                id: req.query.id,
                app: req.query.app,
                app_heading: utils.capitalize(req.query.app),
                type: req.query.type,
                type_heading: utils.typeHeading(req.query.type),
                form: form.toHTML(req, forms.render.table)
            });

            $('#content').html(content);
            document.title = settings.name + ' - Types - ' + req.query.type;
        }
        $('form').bindKansoForm(req);
    });
};

exports.deletetype = function (doc, req) {
    var baseURL = require('kanso/utils').getBaseURL();

    if (!req.client) {
        var loc = baseURL + '/' + req.query.app + '/' + req.query.type;
        doc._deleted = true;
        flashmessages.addMessage(req, {
            type: 'success',
            message: 'Deleted ' + doc._id
        });
        return [doc, {code: 302, headers: {'Location': loc}}];
    }
    db.removeDoc(doc, function (err, resp) {
        if (err) {
            flashmessages.addMessage(req, {
                type: 'error',
                message: err.toString()
            });
        }
        else {
            flashmessages.addMessage(req, {
                type: 'success',
                message: 'Deleted ' + doc._id
            });
        }
        core.setURL('GET',  '/' + req.query.app + '/' + req.query.type);
    });
};
