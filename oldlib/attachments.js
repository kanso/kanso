/*global Buffer: false */

var async = require('../deps/async'),
    mime = require('../deps/node-mime/mime'),
    path = require('path'),
    logger = require('./logger'),
    minify = require('./minify').minify,
    utils = require('./utils'),
    fs = require('fs');


exports.load = function (dir, doc, callback) {
    var paths = doc.settings.attachments;
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
    async.concat(paths, function (p, cb) {
        exports.find(path.join(dir, p), dir, cb);
    },
    function (err, files) {
        if (err) {
            return callback(err);
        }
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
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(file, dir);
        if (!doc._attachments) {
            doc._attachments = {};
        }
        if (doc.settings.minify_attachments && /\.js$/.test(rel)) {
            logger.info('compressing', rel);
            content = new Buffer(minify(content.toString()));
        }
        doc._attachments[rel] = {
            'content_type': mime.lookup(rel),
            'data': content.toString('base64')
        };
        callback();
    });
};

exports.find = function (p, projectdir, callback) {
    utils.find(p, exports.filenameFilter(projectdir), callback);
};

exports.filenameFilter = function (projectdir) {
    return function (f) {
        var relpath = utils.relpath(f, projectdir);
        // should not start with a '.'
        if (/^\./.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        return true;
    };
};
