var utils = require('./utils'),
    core = require('kanso/core'),
    templates = require('kanso/templates'),
    db = require('kanso/db'),
    flashmessages = require('kanso/flashmessages');


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
            app_heading: utils.capitalize(req.query.app),
            type: req.query.type,
            type_heading: utils.typeHeading(req.query.type),
            form: form.toHTML(forms.render.table)
        });

        $('#content').html(content);
        document.title = settings.name + ' - Types - ' + req.query.type;
        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    alert(err);
                }
                else {
                    flashmessages.addMessage(req, 'Added ' + resp.id);
                    core.setURL('GET', '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id);
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
            app_heading: utils.capitalize(req.query.app),
            type: req.query.type,
            type_heading: utils.typeHeading(req.query.type),
            form: form.toHTML(forms.render.table)
        });

        $('#content').html(content);
        document.title = settings.name + ' - Types - ' + req.query.type;
        if (form.isValid()) {
            db.saveDoc(form.values, function (err, resp) {
                if (err) {
                    alert(err);
                }
                else {
                    flashmessages.addMessage(req, 'Saved changes to ' + doc._id);
                    core.setURL('GET', '/' + req.query.app + '/' +
                        req.query.type + '/view/' + resp.id);
                }
            });
        }
    });
};

exports.deletetype = function (doc, req) {
    var baseURL = require('kanso/utils').getBaseURL();

    var res = {code: 302, headers: {'Location': loc}};

    if (!req.client) {
        doc._deleted = true;
        var loc = baseURL + '/' + req.query.app + '/' + req.query.type;
        flashmessages.addMessage(req, doc._id + ' deleted');
        return [doc, res];
    }
    db.removeDoc(doc, function (err, resp) {
        if (err) {
            alert(err);
        }
        else {
            flashmessages.addMessage(req, doc._id + ' deleted');
            core.setURL('GET',  '/' + req.query.app + '/' + req.query.type);
        }
    });
};
