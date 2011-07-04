var modules = require('../../lib/modules');

/**
 * Wraps the settings JSON as a CommonJS Module and includes in the document
 * so package config is easily available in the CommonJS environment.
 */

module.exports = function (path, settings, doc, callback) {
    if (!doc.settings) {
        doc.settings = {};
    }
    var json = JSON.stringify(settings);
    var path = 'settings/' + settings.name;
    var src = 'module.exports = ' + json + ';';
    modules.add(doc, path, src);

    callback(null, doc);
};
