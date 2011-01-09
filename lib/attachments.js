var async = require('../deps/async'),
    mime = require('../deps/node-mime/mime'),
    path = require('path'),
    utils = require('./utils'),
    fs = require('fs');


exports.load = function (dir, doc, callback) {
    var paths = doc.settings.attachments;
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.concat(paths, function (p, cb) {
        exports.find(path.join(dir, p), cb);
    },
    function (err, files) {
        if (err) {
            return callback(err);
        }
        exports.addFiles(dir, files, doc, function (err) {
            if (err) {
                return callback(err);
            }
            exports.addDefault(doc, callback);
        });
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
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(file, dir);
        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments[rel] = {
            'content_type': mime.lookup(rel),
            'data': content.toString('base64')
        };
        callback();
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
        return true;
    }, callback);
};

// adds the kanso attachments
exports.addDefault = function (doc, callback) {
    var dir = __dirname + '/../static';
    var file = dir + '/init.js';
    fs.readFile(file, function (err, content) {
        if (err) {
            return callback(err);
        }
        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments['kanso.js'] = {
            'content_type': 'application/javascript',
            'data': content.toString('base64')
        };
        callback();
    });
};
