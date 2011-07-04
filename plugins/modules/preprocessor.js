var modules = require('../../lib/modules'),
    async = require('../../deps/async');


module.exports = function (path, settings, doc, callback) {
    var paths = settings.modules || [];
    async.forEach(paths, function (p, cb) {
        modules.addPath(path, p, doc, cb);
    },
    function (err) {
        callback(err, doc);
    });
};
