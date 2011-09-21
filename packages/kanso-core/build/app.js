var apputils = require('./apputils'),
    modules = require('kanso/lib/modules'),
    _ = require('kanso/deps/underscore/underscore')._;

/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

function load(module_cache, doc, settings) {
    var p = settings.load;

    try {
        var app = modules.require(module_cache, doc, '/', p);
    }
    catch (err) {
        return callback(err);
    }

    apputils.proxyFns(p, app, doc, 'shows', apputils.proxyShowFn);
    apputils.proxyFns(p, app, doc, 'lists', apputils.proxyListFn);
    apputils.proxyFns(p, app, doc, 'updates', apputils.proxyUpdateFn);
    apputils.proxyFns(p, app, doc, 'filters');
    if (app.hasOwnProperty('validate_doc_update')) {
        apputils.proxyFn(p, app, doc, ['validate_doc_update']);
    }
    return doc;
};

// TODO: loop through doc._kanso_core_load keys and update each like above,
// see packages/load postprocessor for more details

module.exports = function (root, path, settings, doc, callback) {
    var module_cache = {};

    for (var k in doc._kanso_core_load) {
        if (doc._kanso_core_load[k] && doc._kanso_core_load[k].load) {

            // check that this package wants its exports wrapped by kanso-core
            if ('kanso-core' in doc._kanso_core_load[k].dependencies || {}) {
                try {
                    load(module_cache, doc, doc._kanso_core_load[k]);
                }
                catch (e) {
                    return callback(e);
                }
            }

        }
    }

    doc.format = 'kanso';

    // prepend required kanso rewrites and flatten
    doc.rewrites = _.flatten([
        {from: '/modules.js', to: 'modules.js'},
        {from: '/kanso.js', to: 'kanso.js'},
        {from: '/_db/*', to: '../../*'},
        {from: '/_db', to: '../..'}
    ].concat(doc.rewrites || []));

    delete doc._kanso_core_load;
    callback(null, doc);
};
