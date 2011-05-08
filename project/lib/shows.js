/**
 * Show functions to be exported from the design doc.
 */

var templates = require('kanso/templates');


exports.welcome = function (doc, req) {
    var content = templates.render('welcome.html', req, {});

    if (req.client) {
        $('#content').html(content);
        document.title = 'It worked!';
    }
    else {
        return templates.render('base.html', req, {
            title: 'It worked!',
            content: content
        });
    }
};

exports.not_found = function (doc, req) {
    var content = templates.render('404.html', req, {});

    if (req.client) {
        $('#content').html(content);
        document.title = '404 - Not Found';
    }
    else {
        return {code: 404, body: templates.render('base.html', req, {
            title: '404 - Not Found',
            content: content
        })};
    }
};
