var modules = require('./modules'),
    settings = require('./settings');


/**
 * This function is used by unit tests for the kanso commonjs modules.
 */

exports.testRequire = function (path, context, s, callback) {
    var doc = {};

    modules.addKansoModules(doc, function (err) {
        if (err) {
            return callback(err);
        }
        try {
            settings.addToDoc(s, doc);
            var module = modules.require({}, doc, '/', path, context);
        }
        catch (e) {
            return callback(e);
        }
        callback(null, module);
    });
};
