var kanso = require('kanso');


exports.rewrites = [
    {from: '/static/*', to: 'static/jquery-1.4.2.min.js'},
    {from: '/', to: '_show/welcome'}
];

exports.shows = {
    welcome: function (doc, req) {
        return kanso.template(req, 'welcome.html', {});
    }
};
