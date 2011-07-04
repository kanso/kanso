var modules = require('../../lib/modules'),
    async = require('../../deps/async');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (path, settings, doc, callback) {
    var paths = settings.modules || [];
    async.forEach(paths, function (p, cb) {
        modules.addPath(path, p, doc, cb);
    },
    function (err) {
        callback(err, doc);
    });
};
