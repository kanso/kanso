/*global kanso: true, Buffer: false */

var modules = require('./modules'),
    utils = require('./utils'),
    mime = require('../deps/node-mime/mime'),
    minify = require('./minify').minify,
    logger = require('./logger'),
    fs = require('fs');


exports.proxyFn = function (path, app, doc, props) {
    var str = 'function(){return require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i += 1) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += '.apply(this, arguments);}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyFns = function (path, app, doc, prop) {
    if (app[prop]) {
        for (var k in app[prop]) {
            if (app[prop].hasOwnProperty(k)) {
                exports.proxyFn(path, app, doc, [prop, k]);
            }
        }
    }
};

exports.load = function (doc, callback) {
    try {
        var p = doc.settings.load;

        if (p) {
            var module_cache = {};
            var app = modules.require(module_cache, doc, '/', p);
            for (var k in app) {
                if (app.hasOwnProperty(k)) {
                    doc[k] = app[k];
                }
            }
            exports.proxyFns(p, app, doc, 'shows');
            exports.proxyFns(p, app, doc, 'lists');
            exports.proxyFns(p, app, doc, 'updates');
            exports.proxyFns(p, app, doc, 'filters');
            if (app.hasOwnProperty('validate_doc_update')) {
                exports.proxyFn(p, app, doc, ['validate_doc_update']);
            }

            // custom addition for kanso, called from the browser once design doc
            // is loaded and commonjs environment is available
            if (app.hasOwnProperty('init')) {
                exports.proxyFn(p, app, doc, ['init']);
            }
        }

        // prepend required kanso rewrites
        doc.rewrites = [
            {from: '/kanso.js', to: 'kanso.js'},
            {from: '/_db/*', to: '../../*'}
        ].concat(doc.rewrites || []);

        // create kanso.js attachment
        var static_dir = __dirname + '/../static';
        var file = static_dir + '/init.js';
        fs.readFile(file, function (err, content) {
            if (err) {
                return callback(err);
            }
            var data = content.toString() + doc._wrapped_modules +
                '\nkanso.init();';

            if (doc.settings.minify) {
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

            callback(err, doc);
        });
    }
    catch (e) {
        return callback(e);
    }
};
