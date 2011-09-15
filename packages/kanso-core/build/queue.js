module.exports = {
    before: 'properties/load',
    run: function (root, path, settings, doc, callback) {
        doc._kanso_core_load = doc._load;
        callback(null, doc);
    }
};
