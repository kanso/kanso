var modules = require('./modules'),
    utils = require('./utils');


exports.proxyFn = function (path, app, doc, props) {
    var str = 'function(){return require("' + path.replace('"','\\"') + '")';
    for (var i=0; i<props.length; i++) {
        str += '["' + props[i].replace('"', '\\"') + '"]';
    }
    str += '.apply(this, arguments);}';
    utils.setPropertyPath(doc, props.join('/'), str);
};

exports.proxyFns = function (path, app, doc, prop) {
    if (app[prop]) {
        for (var k in app[prop]) {
            exports.proxyFn(path, app, doc, [prop, k]);
        }
    }
};

exports.load = function (doc) {
    var p = doc.settings.load;
    if (p) {
        var module_cache = {};
        var app = modules.require(module_cache, doc, '/', p);
        for (var k in app) {
            doc[k] = app[k];
        }
        exports.proxyFns(p, app, doc, 'shows');
        exports.proxyFns(p, app, doc, 'lists');
        exports.proxyFns(p, app, doc, 'updates');
        exports.proxyFns(p, app, doc, 'filters');
        exports.proxyFn(p, app, doc, ['validate_doc_update']);
        // map functions will be proxy-safe in couchdb 1.1
    }
    return doc;
};
