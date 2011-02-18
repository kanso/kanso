var modules = require('./modules'),
    settings = require('./settings');


/**
 * This function is used by unit tests for the kanso commonjs modules.
 */

exports.testRequire = function (path, mcache, context, s, callback) {
    var module, doc = {};

    if (!Object.keys(mcache).length) {
        modules.addKansoModules(doc, function (err) {
            if (err) {
                return callback(err);
            }
            try {
                settings.addToDoc(s, doc);
                module = modules.require(mcache, doc, '/', path, context);
            }
            catch (e) {
                return callback(e);
            }
            callback(null, module);
        });
    }
    else {
        try {
            module = modules.require(mcache, doc, '/', path, context);
        }
        catch (e) {
            return callback(e);
        }
        callback(null, module);
    }
};
