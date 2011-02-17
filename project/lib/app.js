var templates = require('kanso/templates');


exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_show/welcome'}
];

exports.shows = {
    welcome: function (doc, req) {
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
    }
};
