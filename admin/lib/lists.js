/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    db = require('kanso/db'),
    kanso_utils = require('kanso/utils'),
    templates = require('kanso/templates'),
    flashmessages = require('kanso/flashmessages'),
    _ = require('kanso/underscore');


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
                var val = kanso_utils.getPropertyPath(doc, path.concat([k]));
                if (!fields[k].isEmpty(val) || !fields[k].omit_empty) {
                    pairs.push({
                    field: path.concat([k]).join('.'),
                        value: val
                    });
                }
            }
            else if (kanso_utils.constructorName(fields[k]) === 'Embedded') {
                pairs = pairs.concat(
                    exports.fieldPairs(
                        fields[k].type.fields, doc, path.concat([k])
                    )
                );
            }
            else if (kanso_utils.constructorName(fields[k]) === 'EmbeddedList') {
                var items = kanso_utils.getPropertyPath(doc, path.concat([k]));
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        pairs = pairs.concat(
                            exports.fieldPairs(
                                fields[k].type.fields, doc, path.concat([k,i])
                            )
                        );
                    }
                }
                else {
                    if (!fields[k].omit_empty) {
                        pairs.push({field: path.concat([k]).join('.'), value: ''});
                    }
                }
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

exports.fieldPairsList = function (fields, doc, path) {
    var pairs = [];
    for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
            if (kanso_utils.constructorName(fields[k]) === 'Field') {
                pairs.push({
                    field: path.concat([k]).join('.'),
                    value: kanso_utils.getPropertyPath(doc, path.concat([k]))
                });
            }
            else if (kanso_utils.constructorName(fields[k]) === 'Embedded') {
                var val = kanso_utils.getPropertyPath(doc, path.concat([k]));
                pairs.push({
                    field: path.concat([k]).join('.'),
                    value: val ? val._id: ''
                });
            }
            else if (kanso_utils.constructorName(fields[k]) === 'EmbeddedList') {
                var items = kanso_utils.getPropertyPath(doc, path.concat([k]));
                var val = [];
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        val.push(items[i]._id);
                    }
                }
                pairs.push({
                    field: path.concat([k]).join('.'),
                    value: val.join(', \n')
                });
            }
            else if (typeof fields[k] === 'object') {
                pairs = pairs.concat(
                    exports.fieldPairsList(fields[k], doc, path.concat([k]))
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
        var pairs = exports.fieldPairsList(type.fields, rows[i].doc, []);
        for (var j = 0; j < pairs.length; j++) {
            if (pairs[j].field === '_rev' || pairs[j].field === 'type' ||
                pairs[j].field === '_deleted') {
                pairs.splice(j, 1);
                j = -1;
            }
        }
        f.push({fields: pairs.slice(0, 5), id: rows[i].id});
    }
    var field_names = [];
    var pairs = exports.fieldPairsList(type.fields, {}, []);
    for (var i = 0, len = pairs.length; i < len; i++) {
        var name = pairs[i].field;
        if (name !== '_rev' && name !== 'type' && name !== '_deleted') {
            field_names.push(name);
        }
    }

    var content = templates.render('typelist.html', req, {
        rows: f,
        field_names: field_names.slice(0, 5),
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type)
    });

    $('#content').html(content);
    document.title = req.query.app + ' - ' + req.query.type;

    if (rows.length === 10) {
        var more_link = $('<a href="#">Show more...</a>');
        more_link.data('last_id', rows[rows.length-1].id);
        more_link.click(function (ev) {
            ev.preventDefault();
            var q = {
                startkey: [req.query.type, $(this).data('last_id')],
                endkey: [req.query.type, {}],
                include_docs: true,
                skip: 1,
                limit: 10
            };
            db.getView('types', q, function (err, result) {
                if (result.rows.length < 10) {
                    more_link.remove();
                }
                if (!result.rows.length) {
                    return;
                }
                var rows = result.rows;
                var f = [];
                for (var i = 0, len = rows.length; i < len; i++) {
                    var pairs = exports.fieldPairsList(type.fields, rows[i].doc, []);
                    for (var j = 0; j < pairs.length; j++) {
                        if (pairs[j].field === '_rev' || pairs[j].field === 'type' ||
                            pairs[j].field === '_deleted') {
                            pairs.splice(j, 1);
                            j = -1;
                        }
                    }
                    f.push({fields: pairs.slice(0, 5), id: rows[i].id});
                }
                var html = templates.render('typelist_rows.html', req, {
                    rows: f
                });
                more_link.data('last_id', rows[rows.length-1].id);
                $('table.typelist tbody').append(html);
            });
            return false;
        });
        $('#main').append(more_link);
    }

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
