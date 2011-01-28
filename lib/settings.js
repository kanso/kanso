var utils = require('./utils'),
    path = require('path');


exports.load = function (dir, callback) {
    var settings_file = path.join(dir, 'kanso.json');
    utils.readJSON(settings_file, callback);
};

exports.addToDoc = function (settings, doc) {
    var json = JSON.stringify(settings);
    doc.kanso.settings = 'module.exports = ' + json + ';';
    return doc;
};
