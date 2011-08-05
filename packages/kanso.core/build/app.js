var apputils = require('./apputils'),
    modules = require('../../../lib/modules');

/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (path, settings, doc, callback) {
    var p = settings.load;
    if (!p) {
        return callback(null, doc);
    }

    var module_cache = {};
    var app = modules.require(module_cache, doc, '/', p);

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

    doc.format = 'kanso';

    callback(null, doc);
};
