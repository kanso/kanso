/*global emit: false, start: false, log: false, getRow: false, send: false,
  $: false*/

var utils = require('./utils'),
    db = require('db'),
    core = require('kanso/core'),
    loader = require('./loader'),
    kanso_utils = require('kanso/utils'),
    templates = require('kanso/templates'),
    flashmessages = require('kanso/flashmessages'),
    _ = require('underscore')._;


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
        var appdb = db.use(core.getDBURL());
        appdb.getDesignDoc(req.query.app, function (err, ddoc) {
            if (err) {
                return alert(err);
            }
            fn(rows, ddoc, req);
        });
    };
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
    var settings = loader.appRequire(ddoc, 'settings/root'),
        app = loader.appRequire(ddoc, settings.load),
        fields = loader.appRequire(ddoc, 'kanso/fields'),
        type = app.types ? app.types[req.query.type]: undefined;

    var f = _.map(rows, function (r) {
        var display_name = r.id;
        if (type && type.display_name) {
            display_name = type.display_name(r.doc);
        }
        return {id: r.id, display_name: display_name};
    });

    var content = templates.render('typelist.html', req, {
        rows: f,
        app: req.query.app,
        app_heading: utils.capitalize(req.query.app),
        type: req.query.type,
        type_heading: utils.typeHeading(req.query.type),
        type_title: req.query.type.replace(/_/g, ' ')
    });

    $('#content').html(content);
    document.title = req.query.app + ' - ' + req.query.type;

    if (rows.length === 10) {
        var more_link = $('<a href="#">Show more...</a>');
        more_link.data('last_id', rows[rows.length - 1].id);
        more_link.click(function (ev) {
            ev.preventDefault();
            var q = {
                startkey: [req.query.type, $(this).data('last_id')],
                endkey: [req.query.type, {}],
                include_docs: true,
                skip: 1,
                limit: 10
            };
            var appdb = db.use(core.getDBURL());
            appdb.getView('types', q, function (err, result) {
                if (result.rows.length < 10) {
                    more_link.remove();
                }
                if (!result.rows.length) {
                    return;
                }
                var rows = result.rows;
                var f = _.map(rows, function (r) {
                    var display_name = r.id;
                    if (type && type.display_name) {
                        display_name = type.display_name(r.doc);
                    }
                    return {id: r.id, display_name: display_name};
                });
                var html = templates.render('typelist_rows.html', req, {
                    rows: f,
                    app: req.query.app
                });
                more_link.data('last_id', rows[rows.length - 1].id);
                $('table.typelist tbody').append(html);
            });
            return false;
        });
        $('#main').append(more_link);
    }

    $('#content table.typelist tr:odd').addClass('odd');
});
