var modules = require('./modules');


exports.proxyFns = function (path, app, doc, prop) {
    if (app[prop]) {
        for (var k in app[prop]) {
            doc[prop][k] = 'function(){' +
                'return require("' + path.replace('"','\\"') + '")' +
                    '["' + prop.replace('"', '\\"') + '"]' +
                    '["' + k.replace('"', '\\"') + '"]' +
                    '.apply(this, arguments);' +
            '}';
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
    }
    return doc;
};
