var utils = require('./utils'),
    modules = require('./modules'),
    path = require('path');


exports.load = function (dir, callback) {
    var settings_file = path.join(dir, 'kanso.json');
    utils.readJSON(settings_file, callback);
};

exports.addToDoc = function (settings, doc) {
    var json = JSON.stringify(settings);
    doc.kanso.settings = 'module.exports = ' + json + ';';
    modules.wrap(doc, 'kanso/settings', doc.kanso.settings);
    return doc;
};
