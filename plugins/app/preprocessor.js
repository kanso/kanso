var modules = require('../../lib/modules'),
    mime = require('../../deps/node-mime/mime'),
    async = require('../../deps/async'),
    apputils = require('./apputils'),
    fs = require('fs');


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

    // create kanso.js attachment
    var static_dir = __dirname + '/../../static';
    var file = static_dir + '/kanso.js';
    fs.readFile(file, function (err, content) {
        if (err) {
            return callback(err);
        }
        var data = content.toString();
        data += doc._wrapped_modules || '';
        data += '\nkanso.init();';

        if (settings.minify) {
            logger.info('compressing', 'kanso.js');
            data = minify(data);
        }

        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments['kanso.js'] = {
            'content_type': mime.lookup('kanso.js'),
            'data': new Buffer(data).toString('base64')
        };
        delete doc._wrapped_modules;

        doc.format = 'kanso';
        callback(null, doc);
    });
};
