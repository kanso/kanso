var utils = require('./utils'),
    async = require('async');


/**
 * Loads templates, partials and helpers registered on the design doc by the
 * preprocessors and appends them to the handlebars.js module.
 */

module.exports = {
    before: 'modules/attachment',
    run: function (root, path, settings, doc, callback) {
        if (doc._handlebars) {
            utils.addTemplates(doc, doc._handlebars.templates, function (err) {
                if (err) {
                    return callback(err);
                }
                if (settings.handlebars.all_partials) {
                    utils.addTemplatePartials(doc, doc._handlebars.templates);
                }
                delete doc._handlebars;
                callback(err, doc);
            });
        }
        else {
            callback(null, doc);
        }
    }
};
