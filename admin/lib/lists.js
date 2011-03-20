/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    kanso_utils = require('kanso/utils'),
    templates = require('kanso/templates'),
    flashmessages = require('kanso/flashmessages');


/**
 * Standard response for non-js requests, fetches design_doc before executing
 * view.
 */

var adminList = function (fn) {
    return function (head, req) {
        start({code: 200, headers: {'Content-Type': 'text/html'}});
        if (!req.client) {
            return templates.render('base.html', req, {
                title: 'Admin',
                content: templates.render('noscript.html', req, {})
            });
        }
        var row = getRow(), rows = [];
        while (row) {
            rows.push(row);
            row = getRow();
        }
        utils.getDesignDoc(req.query.app, function (err, ddoc) {
            if (err) {
                return alert(err);
            }
            fn(rows, ddoc, req);
        });
    };
};


exports.fieldPairs = function (fields, doc, path) {
    var pairs = [];
    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            if (kanso_utils.constructorName(fields[k]) === 'Field') {
                pairs.push({
                    field: path.concat([k]).join('.'),
                    value: kanso_utils.getPropertyPath(doc, path.concat([k]))
                });
            }
            else if (typeof fields[k] === 'object') {
                pairs = pairs.concat(
                    exports.fieldPairs(fields[k], doc, path.concat([k]))
                );
            }
        }
    }
    return pairs;
};


exports.applist = function (head, req) {
    start({code: 200, headers: {'Content-Type': 'text/html'}});
    var row = getRow(), rows = [];
    while (row) {
        rows.push(row);
        row = getRow();
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
};

exports.typelist = adminList(function (rows, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        fields = utils.appRequire(ddoc, 'kanso/fields'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[req.query.type]: undefined;

    var f = [];
    for (var i = 0, len = rows.length; i < len; i++) {
        var pairs = exports.fieldPairs(type.fields, rows[i].doc, []);
        for (var j = 0; j < pairs.length; j++) {
            if (pairs[j].field === '_rev' || pairs[j].field === 'type') {
                pairs.splice(j, 1);
                j = -1;
            }
        }
        f.push({fields: pairs.slice(0, 5), id: rows[i].id});
    }
    var field_names = [];
    for (var k in type.fields) {
        if (k !== '_rev' && k !== 'type') {
            field_names.push(k);
        }
    }

    var content = templates.render('typelist.html', req, {
        rows: f,
        field_names: field_names,
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type)
    });

    $('#content').html(content);
    document.title = req.query.app + ' - ' + req.query.type;

    $('#content table.typelist tr:odd').addClass('odd');
});


exports.viewtype = function (head, req) {
    if (!req.client) {
        start({code: 200, headers: {'Content-Type': 'text/html'}});
        return templates.render('base.html', req, {
            title: req.query.app + ' - Types - ' + req.query.type,
            content: templates.render('noscript.html', req, {})
        });
    }
    var row = getRow();
    if (!row) {
        start({code: 404, headers: {'Content-Type': 'text/html'}});
        return '<h1>No such document</h1>'
    }
    start({code: 200, headers: {'Content-Type': 'text/html'}});
    var doc = row.doc;
    utils.getDesignDoc(req.query.app, function (err, ddoc) {
        if (err) {
            return alert(err);
        }
        var settings = utils.appRequire(ddoc, 'kanso/settings'),
            fields = utils.appRequire(ddoc, 'kanso/fields'),
            app = utils.appRequire(ddoc, settings.load),
            type = app.types ? app.types[req.query.type]: undefined;

        var content = templates.render('viewtype.html', req, {
            fields: exports.fieldPairs(type.fields, doc, []),
            doc: doc,
            app: req.query.app,
            app_heading: utils.capitalize(req.query.app),
            type: req.query.type,
            type_plural: utils.typePlural(req.query.type),
            type_heading: utils.typeHeading(req.query.type)
        });
        var title = req.query.app + ' - ' + req.query.type + ' - ' + req.query.id;
        if (req.client) {
            $('#content').html(content);
            document.title = title;
        }
        else {
            return templates.render('base.html', req, {
                title: title,
                content: content
            });
        }
    });
};
