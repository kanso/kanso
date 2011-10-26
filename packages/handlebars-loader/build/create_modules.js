var async = require('async'),
    templates = require('./templates');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var paths = settings.handlebars_templates || [];
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.forEach(paths, function (p, cb) {
        templates.addPath(path, p, doc, cb);
    },
    function (err) {
        callback(err, doc);
    });
};
