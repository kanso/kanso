var kanso = require('kanso');


exports.rewrites = [
    {from: '/kanso.js', to: 'kanso.js'},
    {from: '/_db/*', to: '../../*'},
    {from: '/_designdoc', to: './'},
    {from: '/', to: '_show/hello'},
    {from: '/static/*', to: 'static/*'},
    {from: '/:name', to: '_show/hello'}
];

exports.shows = {
    'hello': function (doc, req, client) {
        //log(req);
        var name = (req.query && req.query.name) || 'world';
        if (req.client) {
            $('#result').html('hello ' + name);
            if (name !== 'world') {
                $('#result').append(' <br/><a href="/">back<a>');
            }
        }
        else {
            return kanso.template(req, 'base.html', {name: name});
        }
    }
};
