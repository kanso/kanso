var utils = require('./utils'),
    async = require('async');


/**
 * Registers templates on the design doc so they can be loaded at the post
 * processor stage.
 */

module.exports = function (root, dir, settings, doc, callback) {
    if (settings.handlebars && settings.handlebars.templates) {
        var path = settings.handlebars.templates;
        if (Array.isArray(path)) {
            return callback(new Error(
                'Only one template directory may be specified'
            ));
        }
        return utils.registerTemplates(dir, doc, path, callback);
    }
    callback(null, doc);
};
