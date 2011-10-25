var utils = require('kanso/utils'),
    async = require('async'),
    attachments = require('kanso/attachments'),
    fs = require('fs');


exports.loadAttachments = function (pkgdir, p, doc, callback) {
    attachments.addPath(pkgdir, p, doc, callback);
};

exports.loadFiles = function (pkgdir, p, doc, callback) {
    p = utils.abspath(p, pkgdir);
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        async.forEach(files, function (f, cb) {
            exports.addFile(pkgdir, f, doc, cb);
        }, callback);
    });
};

exports.addFile = function (pkgdir, p, doc, callback) {
    fs.readFile(p, function (err, content) {
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(p, pkgdir);
        var prop = rel;
        if (rel.indexOf('.') !== -1) {
            var parts = rel.split('.');
            prop = parts.slice(0, parts.length - 1).join('.');
        }
        var src = content.toString();
        exports.add(doc, prop, src);
        callback()
    });
};

exports.add = function (doc, path, src) {
    utils.setPropertyPath(doc, path, src);
    return doc;
};

exports.find = async.memoize(function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
});

exports.filenameFilter = function (p) {
    return function (f) {
        if (f === p) {
            return true;
        }
        var relpath = utils.relpath(f, p);
        // should not start with a '.'
        if (/^\.[^\/]?/.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        return true;
    };
};
