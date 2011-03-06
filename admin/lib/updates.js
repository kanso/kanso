var utils = require('./utils'),
    templates = require('kanso/templates'),
    db = require('kanso/db');


exports.addtype = function (doc, req) {
    if (!req.client) {
        return [null, templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + req.query.type,
            content: '<p>Javascript must be enabled to view this page</p>'
        })];
    }
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[req.query.type]: undefined;

        var forms = utils.appRequire(ddoc, 'kanso/forms'),
            form = new forms.Form(type);

        form.validate(req);
        var content = templates.render('add_type.html', req, {
            app: req.query.app,
            type: req.query.type,
            form: form.toHTML()
        });

        $('#content').html(content);
        document.title = settings.name + ' - Types - ' + req.query.type;
        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    alert(err);
                }
                else {
                    //alert('saved successfully');
                    var baseURL = require('kanso/utils').getBaseURL();
                    window.location = baseURL + '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id;
                }
            });
        }
    });
};

exports.updatetype = function (doc, req) {
    if (!req.client) {
        return [null, templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + req.query.type,
            content: '<p>Javascript must be enabled to view this page</p>'
        })];
    }
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[req.query.type]: undefined;

        var forms = utils.appRequire(ddoc, 'kanso/forms'),
            form = new forms.Form(type);

        form.validate(req);
        var content = templates.render('edit_type.html', req, {
            id: req.query.id,
            app: req.query.app,
            type: req.query.type,
            form: form.toHTML()
        });

        $('#content').html(content);
        document.title = settings.name + ' - Types - ' + req.query.type;
        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    alert(err);
                }
                else {
                    //alert('saved successfully');
                    var baseURL = require('kanso/utils').getBaseURL();
                    window.location = baseURL + '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id;
                }
            });
        }
    });
};
