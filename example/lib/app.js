var kanso = require('kanso');


exports.rewrites = [
    {from: '/', to: '_show/hello'},
    {from: '/static/*', to: 'static/*'},
    {from: '/:name', to: '_show/hello'}
];

exports.shows = {
    'hello': function (doc, req, client) {
        var name = (req.query && req.query.name) || 'world';
        if (req.client) {
            $('#result').html('hello ' + name);
            if (name !== 'world') {
                $('#result').append(' <br/><a href="/">back<a>');
            }
        }
        else {
            return kanso.template('base.html', req, {name: name});
        }
    }
};
