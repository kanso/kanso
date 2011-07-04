var modules = require('../../lib/modules');


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
