var dust = require('kanso/deps/dustjs/lib/dust'),
    async = require('kanso/deps/async'),
    utils = require('kanso/lib/utils'),
    path = require('path'),
    fs = require('fs');


// disable whitespace compression
dust.optimizers.format = function (ctx, node) {
    return node;
};

exports.addPath = function (pkgdir, p, doc, callback) {
    p = utils.abspath(p, pkgdir);
    exports.find(p, function (err, files) {
        if (err) {
            return callback(err);
        }
        async.forEach(files, function (f, cb) {
            exports.addFile(p, f, doc, cb);
        }, callback);
    });
};

exports.addFile = function (template_dir, file, doc, callback) {
    fs.readFile(file, function (err, content) {
        if (err) {
            return callback(err);
        }
        var rel = utils.relpath(file, template_dir);
        if (!doc.templates) {
            doc.templates = {};
        }
        doc.templates[rel] = dust.compile(content.toString(), rel);
        callback();
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
