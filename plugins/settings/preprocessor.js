module.exports = function (path, settings, doc, callback) {
    if (!doc.settings) {
        doc.settings = {};
    }
    doc.settings[settings.name] = settings;
    callback(null, doc);
};
