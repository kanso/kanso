var fs = require('fs'),
    path = require('path'),
    async = require('../deps/async'),
    utils = require('./utils'),
    Script = process.binding('evals').Script;


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

/**
 * Loads a commonjs module from the loaded design document, returning
 * the exported properties. The current_dir and target parameters are not the
 * path of the module on the filesystem, but rather the path of the module
 * within couchdb, root ('/') being the design doc itself.
 *
 * @param {Object} module_cache
 * @param {Object} doc
 * @param {String} current_dir
 * @param {String} target
 */

exports.require = function (module_cache, doc, current_dir, target) {
    //logger.debug('require:', current_dir + '/' + target);
    if (target.charAt(0) !== '.') {
        current_dir = '/';
    }
    var p = path.normalize(path.join(current_dir, target));
    if (module_cache[p]) return module_cache[p];

    var nodes = p.split('/').slice(1);
    var content = nodes.reduce(function (a, x) {
        if (a[x] === undefined) {
            throw new Error('Could not require module: ' + target);
        }
        return a = a[x];
    }, doc);

    var sandbox = {
        module: {exports: {}},
        require: async.apply(
            exports.require, module_cache, doc, path.dirname(p)
        )
    };
    sandbox.exports = sandbox.module.exports;

    try {
        var s = new Script(content).runInNewContext(sandbox);
    }
    catch (e) {
        var stack = e.stack.split('\n').slice(0,1).concat(['\tin '+p.slice(1)]);
        e.stack = stack.join('\n');
        throw e;
    }
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
