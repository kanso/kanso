var utils = require('./utils'),
    path = require('path');


exports.load = function (dir, callback) {
    var settings_file = path.join(dir, 'kanso.json');
    utils.readJSON(settings_file, callback);
};
