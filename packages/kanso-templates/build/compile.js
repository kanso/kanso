var templates = require('./templates');


/**
 * Loads module directories specified in kanso.json and adds the modules
 * to the document.
 */

module.exports = function (root, path, settings, doc, callback) {
    var p = settings.templates;
    if (!p) {
        return callback(null, doc);
    }
    if (Array.isArray(p)) {
        // TODO: remove this once merging works
        return callback(new Error(
            'Only a single templates directory may be specified'
        ));
    }
    // load the templates
    templates.addPath(path, p, doc, function (err) {
        callback(err, doc);
    });
};
