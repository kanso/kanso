var fs = require('fs'),
    path = require('path'),
    async = require('../deps/async'),
    utils = require('./utils');


exports.load = function (dir, doc, callback) {
    var paths = doc.settings.modules;
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.concat(paths, function (p, cb) {
        exports.find(path.join(dir, p), cb);
    },
    function (err, files) {
        if (err) return callback(err);
        exports.addFiles(dir, files, doc, callback);
    });
};

exports.addFiles = function (dir, files, doc, callback) {
    dir = utils.abspath(dir);
    async.forEach(files, function (f, cb) {
        exports.addFile(dir, utils.abspath(f), doc, cb);
    }, callback);
};

exports.addFile = function (dir, file, doc, callback) {
    fs.readFile(file, function (err, content) {
        if (err) return callback(err);
        var rel = utils.relpath(file, dir);
        utils.setPropertyPath(doc, rel, content.toString());
        callback();
    });
};

exports.find = function (p, callback) {
    utils.find(p, /^[^\.]+(?!\/\.)*\.js$/, callback);
};
