var fs = require('fs'),
    async = require('../deps/async'),
    utils = require('./utils');


exports.eachDoc = function (p, iterator, callback) {
    fs.stat(p, function (err, stats) {
        if (err) {
            return callback(err);
        }
        if (stats.isDirectory()) {
            exports.find(p, function (err, files) {
                if (err) {
                    return callback(err);
                }
                async.forEach(files, function (f, cb) {
                    if (err) {
                        return callback(err);
                    }
                    utils.readJSON(f, function (err, doc) {
                        if (err) {
                            return callback(err);
                        }
                        iterator(doc, cb);
                    });
                }, callback);
            });
        }
        else {
            utils.readJSON(p, function (err, doc) {
                if (err) {
                    return callback(err);
                }
                iterator(doc, callback);
            });
        }
    });
};

exports.find = function (p, callback) {
    utils.find(p, function (f) {
        // should not start with a '.'
        if (/^\./.test(f)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(f)) {
            return false;
        }
        // should have a .json extension
        if (!/\.json$/.test(f)) {
            return false;
        }
        return true;
    }, callback);
};
