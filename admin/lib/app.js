var db = require('kanso/db');


exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/types/_design/:app'},
    {from: '/:app/:type/add', to: '_show/addtype', method: 'GET'},
    {from: '/:app/:type/add', to: '_update/addtype', method: 'POST'},
    {from: '/:app/:type', to: '_list/typelist/types', query: {
        startkey: [':type'], endkey: [':type', {}]
    }},
    {from: '/:app/:type/view/:id', to: '_list/viewtype/types', query: {
        key: [':type', ':id'], include_docs: true
    }}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
exports.updates = require('./updates');
