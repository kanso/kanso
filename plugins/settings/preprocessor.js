var modules = require('../../lib/modules');

/**
 * Wraps the settings JSON as a CommonJS Module and includes in the document
 * so package config is easily available in the CommonJS environment.
 */

function add_settings(doc, settings, name) {
    name = name || 'packages/' + settings.name;
    var json = JSON.stringify(settings);
    var path = 'settings/' + name;
    var src = 'module.exports = ' + json + ';';
    modules.add(doc, path, src);
    return doc;
}

module.exports = function (root, path, settings, doc, callback) {
    if (!doc.settings) {
        doc.settings = {};
    }
    if (!doc.settings.packages) {
        doc.settings.packages = {};
    }
    add_settings(doc, settings);
    if (root) {
        if (doc.settings.root) {
            return callback(new Error('Root settings conflict'));
        }
        add_settings(doc, settings, 'root');
    }
    callback(null, doc);
};
