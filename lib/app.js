var modules = require('./modules');

exports.load = function (doc) {
    var p = doc.settings.load;
    if (p) {
        var module_cache = {};
        var app = modules.require(module_cache, doc, '/', p);
        for (var k in app) {
            doc[k] = app[k];
        }
    }
    return doc;
};
