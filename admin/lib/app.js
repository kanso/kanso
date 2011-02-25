exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/types/_design/:app'},
    {from: '/:app/:type/add', to: '_show/addtype/_design/:app'},
    {from: '/:app/:type', to: '_list/typelist/types', query: {
        startkey: [':type'], endkey: [':type', {}]
    }}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
