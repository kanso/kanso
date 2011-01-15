var kanso = require('kanso/core');


exports.rewrites = [
    {from: '/', to: '_show/hello'},
    {from: '/static/*', to: 'static/*'},
    {from: '/:name', to: '_show/hello'}
];

exports.shows = {
    'hello': function (doc, req) {
        var greeting = (req.query && req.query.greeting) || 'hello';
        var name = (req.query && req.query.name) || 'world';

        if (req.client) {
            console.log(req);
            $('#result').html(greeting + ' ' + name);
            if (name !== 'world') {
                $('#result').append(' <br/><a href="/">back<a>');
            }
        }
        else {
            return kanso.template('base.html', req, {
                name: name,
                greeting: greeting
            });
        }
    }
};
