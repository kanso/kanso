var async = require('async'),
    utils = require('kanso/utils'),
    logger = require('kanso/logger'),
    modules = require('kanso/modules'),
    path = require('path'),
    fs = require('fs');


exports.addPath = function (pkgdir, p, doc, callback) {
    p = utils.abspath(p, pkgdir);
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        async.forEach(files, function (f, cb) {
            exports.addFile(pkgdir, p, f, doc, cb);
        }, callback);
    });
};

exports.addFile = function (pkgdir, template_dir, file, doc, callback) {
    fs.readFile(file, function (err, content) {
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(file, pkgdir);
        content = content.toString().replace(/"/g, '\\"');
        content = content.replace(/\n/g, '\\n');
        var src = 'var handlebars = require("handlebars");\n' +
            '\n' +
            'module.exports = handlebars.compile(\n' +
            '    "' + content + '"\n' +
            ');';
        modules.add(doc, rel, src);
        callback(null, doc);
    });
};

exports.find = function (p, callback) {
    utils.find(p, exports.filenameFilter(p), callback);
};

exports.filenameFilter = function (p) {
    return function (f) {
        var relpath = utils.relpath(f, p);
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
