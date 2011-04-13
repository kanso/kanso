/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    kanso_utils = require('kanso/utils'),
    db = require('kanso/db'),
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

    var views = [];
    if (app.views) {
        for (var k in app.views) {
            if (app.views.hasOwnProperty(k)) {
                views.push(k);
            }
        }
    }

    var res = {code: 200, headers: {'Content-Type': 'text/html'}};

    var content = templates.render('app.html', req, {
        types: types,
        views: views,
        app: settings.name,
        app_heading: utils.capitalize(settings.name)
    });

    if (req.client) {
        $('#content').html(content);
        document.title = settings.name + ' - Types';
    }
    else {
        res.body = templates.render('base.html', req, {
            title: settings.name,
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
        type = app.types ? app.types[doc.type]: undefined;

    var forms = utils.appRequire(ddoc, 'kanso/forms'),
        form = new forms.Form(type, doc);

    var content = templates.render('edit_type.html', req, {
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: doc.type,
        type_heading: utils.typeHeading(doc.type),
        id: req.query.id,
        form: form.toHTML(req, forms.render.table)
    });

    $('#content').html(content);
    document.title = settings.name + ' - Types - ' + doc.type;
    admin_forms.bind(req);
});

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
                /*pairs = pairs.concat(
                    exports.fieldPairs(
                        fields[k].type.fields, doc, path.concat([k])
                    )
                );*/
                var val = kanso_utils.getPropertyPath(doc, path.concat([k]));
                var type = fields[k].type;
                var display_name = val ? val._id: '';
                if (type.display_name) {
                    display_name = type.display_name(val);
                }
                pairs.push({
                    field: path.concat([k]).join('.'),
                    value: display_name
                });
            }
            else if (kanso_utils.constructorName(fields[k]) === 'EmbeddedList') {
                var items = kanso_utils.getPropertyPath(doc, path.concat([k]));
                if (items) {
                    for (var i = 0; i < items.length; i++) {
                        /*
                        pairs = pairs.concat(
                            exports.fieldPairs(
                                fields[k].type.fields, doc, path.concat([k,i])
                            )
                        );
                        */
                        var val = kanso_utils.getPropertyPath(doc, path.concat([k,i]));
                        var type = fields[k].type;
                        var display_name = val ? val._id: '';
                        if (type.display_name) {
                            display_name = type.display_name(val);
                        }
                        pairs.push({
                            field: path.concat([k,i]).join('.'),
                            value: display_name
                        });
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


exports.viewlist = adminShow(function (doc, ddoc, req) {
    var base = kanso_utils.getBaseURL();
    var view_req = {
        url: base + '/_db/_design/' + req.query.app + '/_view/' + req.query.view,
        data: db.stringifyQuery(req.query)
    };
    db.request(view_req, function (err, res) {
        if (err) {
            // TODO: what's best to do here?
            alert(err);
            return;
        }
        console.log('viewlist');
        console.log(res);
        var rows = res.rows.map(function (r) {
            r.value = JSON.stringify(r.value);
            r.key = JSON.stringify(r.key);
            return r;
        });

        if (req.query.descending === 'true') {
            rows = rows.reverse();
        }

        var last_row = rows[rows.length - 1];
        var last_key = last_row ? last_row.key: null;
        var last_id = last_row ? last_row.id: null;
        var next_link = '' +
            '?startkey=' + encodeURIComponent(last_key) +
            '&startkey_docid=' + encodeURIComponent(last_id) +
            '&skip=1';

        var show_next_link = true;
        if (req.query.descending === 'true') {
            show_next_link = !!(res.offset);
        }
        else {
            show_next_link = (res.offset + rows.length < res.total_rows);
        }

        var first_row = rows[0];
        var first_key = first_row ? first_row.key: null;
        var first_id = first_row ? first_row.id: null;
        var prev_link = '' +
            '?startkey=' + encodeURIComponent(first_key) +
            '&startkey_docid=' + encodeURIComponent(first_id) +
            '&descending=true' +
            '&skip=1';

        var show_prev_link = true;
        if (req.query.descending === 'true') {
            show_prev_link = (res.offset + rows.length < res.total_rows);
        }
        else {
            show_prev_link = !!(res.offset);
        }

        var range;
        if (req.query.descending === 'true') {
            range = (res.total_rows - (res.offset + res.rows.length)) + '-' +
                (res.total_rows - res.offset) + ' of ' +
                res.total_rows;
        }
        else {
            range = res.offset + '-' +
                (res.offset + res.rows.length) + ' of ' +
                res.total_rows;
        }


        var content = templates.render('view.html', req, {
            rows: rows,
            view_heading: utils.viewHeading(req.query.view),
            view: req.query.view,
            app: req.query.app,
            app_heading: utils.capitalize(req.query.app),
            offset: res.offset,
            total_rows: res.total_rows,
            next_link: next_link,
            show_next_link: show_next_link,
            prev_link: prev_link,
            show_prev_link: show_prev_link,
            range: range
        });
        var title = req.query.app + ' - ' + req.query.view;
        $('#content').html(content);
        document.title = title;
    });
});


exports.viewtype = adminShow(function (doc, ddoc, req) {
    var settings = utils.appRequire(ddoc, 'kanso/settings'),
        fields = utils.appRequire(ddoc, 'kanso/fields'),
        app = utils.appRequire(ddoc, settings.load),
        type = app.types ? app.types[doc.type]: undefined;

    if (!doc) {
        $('#content').html('<h1>No such document</h1>');
        alert('No such document');
        return;
    }

    var tfields = type ? type.fields: {};
    var content = templates.render('viewtype.html', req, {
        fields: exports.fieldPairs(tfields, doc, []),
        doc: doc,
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: doc.type,
        type_plural: utils.typePlural(doc.type),
        type_heading: utils.typeHeading(doc.type)
    });

    var title = req.query.app + ' - ' + doc.type + ' - ' + req.query.id;
    $('#content').html(content);
    document.title = title;
});
