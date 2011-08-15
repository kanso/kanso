var modules = require('../../../lib/modules'),
    utils = require('../../../lib/utils');


var proxyFn = function (path, app, doc, props) {
    var str = 'function(){return require("' + path.replace('"', '\\"') + '")';
    for (var i = 0; i < props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += '.apply(this, arguments);}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

var proxyFns = function (path, app, doc, prop) {
    if (app[prop]) {
        for (var k in app[prop]) {
            if (app[prop].hasOwnProperty(k)) {
                proxyFn(path, app, doc, [prop, k]);
            }
        }
    }
};

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
    try {
        var app = modules.require(module_cache, doc, '/', p);
    }
    catch (err) {
        return callback(err);
    }

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
    // if undefined or null, assume default value of 'true'
    if (settings.proxy_functions !== false) {
        proxyFns(p, app, doc, 'shows');
        proxyFns(p, app, doc, 'lists');
        proxyFns(p, app, doc, 'updates');
        proxyFns(p, app, doc, 'filters');
        if (app.hasOwnProperty('validate_doc_update')) {
            proxyFn(p, app, doc, ['validate_doc_update']);
        }
    }

    callback(null, doc);
};
