var modules = require('../../lib/modules'),
    async = require('../../deps/async'),
    apputils = require('./apputils');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var p = settings.load;
    if (!p) {
        return callback(null, doc);
    }

    var module_cache = {};
    var app = modules.require(module_cache, doc, '/', p);

    for (var k in app) {
        if (app.hasOwnProperty(k)) {
            if (doc[k] && typeof doc[k] === 'object' &&
                app[k] && typeof app[k] === 'object') {
                // extend exisiting object
                for (var k2 in app[k]) {
                    doc[k][k2] = app[k][k2];
                }
            }
            else {
                doc[k] = app[k];
            }
        }
    }
    apputils.proxyFns(p, app, doc, 'shows', apputils.proxyShowFn);
    apputils.proxyFns(p, app, doc, 'lists', apputils.proxyListFn);
    apputils.proxyFns(p, app, doc, 'updates', apputils.proxyUpdateFn);
    apputils.proxyFns(p, app, doc, 'filters');
    if (app.hasOwnProperty('validate_doc_update')) {
        apputils.proxyFn(p, app, doc, ['validate_doc_update']);
    }

    // prepend required kanso rewrites
    doc.rewrites = [
        {from: '/kanso.js', to: 'kanso.js'},
        {from: '/_db/*', to: '../../*'},
        {from: '/_db', to: '../..'}
    ].concat(doc.rewrites || []);

    callback(null, doc);
};
