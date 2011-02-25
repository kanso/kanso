exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/typelist/_design/:app'},
    {from: '/:app/:type', to: '_show/type/_design/:app'}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
