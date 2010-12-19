var kanso = require('kanso');


exports.rewrites = [
    {from: '/', to: '_show/hello'},
    {from: '/static/*', to: 'static/*'},
    {from: '/_db/*', to: '../../*'},
    {from: '/_designdoc', to: './'},
    {from: '/:name', to: '_show/hello'}
];

exports.shows = {
    'hello': function (doc, req, client) {
        //log(req);
        var name = (req.query && req.query.name) || 'world';
        if (client) {
            $('#result').html('hello ' + name);
            if (name !== 'world') {
                $('#result').append(' <br/><a href="/">back<a>');
            }
        }
        else {
            return kanso.template('base.html', {name: name});
        }
    }
};
