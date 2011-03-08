var db = require('kanso/db');


exports.options = {
    include_design: true
};

exports.rewrites = [
    {from: '/static/*', to: 'static/*'},
    {from: '/', to: '_list/applist/apps'},
    {from: '/:app', to: '_show/types/_design/:app'},
    {from: '/:app/:type/add', to: '_show/addtype', method: 'GET'},
    {from: '/:app/:type/add', to: '_update/updatetype', method: 'POST'},
    {from: '/:app/:type', to: '_list/typelist/types', query: {
        startkey: [':type'], endkey: [':type', {}], include_docs: true
    }},
    {from: '/:app/:type/view/:id', to: '_list/viewtype/types', query: {
        key: [':type', ':id'], include_docs: true
    }},
    {from: '/:app/:type/edit/:id', to: '_show/edittype/:id', method: 'GET'},
    {from: '/:app/:type/edit/:id', to: '_update/updatetype/:id', method: 'POST'},
    {from: '/:app/:type/delete/:id', to: '_update/deletetype/:id', method: 'POST'}
];

exports.views = require('./views');
exports.lists = require('./lists');
exports.shows = require('./shows');
exports.updates = require('./updates');
