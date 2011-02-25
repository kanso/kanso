var templates = require('kanso/templates');


exports.applist = function (head, req) {
    start({code: 200, headers: {'Content-Type': 'text/html'}});
    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
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

exports.typelist = function (head, req) {
    start({code: 200, headers: {'Content-Type': 'text/html'}});
    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
    }
    var content = templates.render('typelist.html', req, {
        rows: rows,
        app: req.query.app,
        type: req.query.type
    });
    if (req.client) {
        $('#content').html(content);
        document.title = req.query.app + ' - ' + req.query.type
    }
    else {
        return templates.render('base.html', req, {
            title: req.query.app + ' - ' + req.query.type,
            content: content
        });
    }
};
