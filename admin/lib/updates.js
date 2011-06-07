/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    forms = require('kanso/forms'),
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

        form.validate(req.form);

        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    flashmessages.addMessage(req, {
                        type: 'error',
                        message: err.message || err.toString()
                    });

                    var content = templates.render('add_type.html', req, {
                        app: req.query.app,
                        app_heading: utils.capitalize(req.query.app),
                        type: req.query.type,
                        description: type.description,
                        type_heading: utils.typeHeading(req.query.type),
                        form: form.toHTML(req)
                    });

                    content += widgets.scriptTagForInit('lib/forms', 'bind');
                    $('#content').html(content);

                    document.title = settings.name + ' - Types - ' + req.query.type;
                }
                else {
                    flashmessages.addMessage(req, {
                        type: 'success',
                        message: 'Added ' + resp.id
                    });
                    core.setURL('GET', '/' + req.query.app + '/view/' + resp.id);
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
                description: type.description,
                type_heading: utils.typeHeading(req.query.type),
                form: form.toHTML(req)
            });

            content += widgets.scriptTagForInit('lib/forms', 'bind');
            $('#content').html(content);

            document.title = settings.name + ' - Types - ' + req.query.type;
        }
    });
};

exports.updatetype = function (doc, req) {
    if (!req.client) {
        return [null, templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + doc.type,
            content: templates.render('noscript.html', req, {})
        })];
    }
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[doc.type]: undefined;

        var forms = utils.appRequire(ddoc, 'kanso/forms'),
            form = new forms.Form(type);

        form.validate(req.form);

        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    flashmessages.addMessage(req, {
                        type: 'error',
                        message: err.message || err.toString()
                    });

                    var content = templates.render('edit_type.html', req, {
                        id: req.query.id,
                        app: req.query.app,
                        app_heading: utils.capitalize(req.query.app),
                        type: doc.type,
                        type_heading: utils.typeHeading(doc.type),
                        form: form.toHTML(req)
                    });

                    content += widgets.scriptTagForInit('lib/forms', 'bind');
                    $('#content').html(content);

                    document.title = settings.name + ' - Types - ' + doc.type;
                }
                else {
                    flashmessages.addMessage(req, {
                        type: 'success',
                        message: 'Saved changes to ' + doc._id
                    });
                    core.setURL('GET', '/' + req.query.app + '/view/' + resp.id);
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
                type: doc.type,
                type_heading: utils.typeHeading(doc.type),
                form: form.toHTML(req)
            });

            content += widgets.scriptTagForInit('lib/forms', 'bind');
            $('#content').html(content);

            document.title = settings.name + ' - Types - ' + doc.type;
        }
    });
};

exports.deletetype = function (doc, req) {
    var baseURL = require('kanso/utils').getBaseURL();

    if (!req.client) {
        var loc = baseURL + '/' + req.query.app + '/types/' + doc.type;
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
                message: err.message || err.toString()
            });
        }
        else {
            flashmessages.addMessage(req, {
                type: 'success',
                message: 'Deleted ' + doc._id
            });
        }
        core.setURL('GET', core.appPath(
            (req.form && req.form.next) ||
            ('/' + req.query.app + '/types/' + doc.type)
        ));
    });
};
