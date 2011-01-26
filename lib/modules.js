var fs = require('fs'),
    path = require('path'),
    async = require('../deps/async'),
    utils = require('./utils'),
    Script = process.binding('evals').Script;


// As modules are added, their original file paths are added to this object
// eg: {'lib': {'mymodule': '/home/user/project/lib/mymodule.js'}, ...}
exports.originalPaths = {};


exports.load = function (dir, doc, callback) {
    var paths = doc.settings.modules;
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
        async.series([
            async.apply(exports.addFiles, dir, files, doc),
            function (cb) {
                var default_dir = __dirname + '/../commonjs';
                exports.find(default_dir, default_dir, function (err, files) {
                    if (err) {
                        return cb(err);
                    }
                    if (!files.length) {
                        return cb(new Error(
                            'Couldn\'t find kanso core commonjs modules in: ' +
                            default_dir
                        ));
                    }
                    exports.addFiles(default_dir, files, doc, cb);
                });
            }
        ], callback);
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
        utils.setPropertyPath(doc, rel, content.toString());
        utils.setPropertyPath(exports.originalPaths, rel, file);
        callback();
    });
};

exports.find = function (p, projectdir, callback) {
    utils.find(p, function (f) {
        var relpath = utils.relpath(f, projectdir);
        // should not start with a '.'
        if (/^\./.test(relpath)) {
            return false;
        }
        // should not contain a file or folder starting with a '.'
        if (/\/\./.test(relpath)) {
            return false;
        }
        // should have a .js extension
        if (!/\.js$/.test(f)) {
            return false;
        }
        return true;
    }, callback);
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
 * @param {Object} context - optional, extends sandbox object
 */

exports.require = function (module_cache, doc, current_dir, target, context) {
    //logger.debug('require:', current_dir + '/' + target);
    if (target.charAt(0) !== '.') {
        current_dir = '/';
    }
    var p = path.normalize(path.join(current_dir, target));
    if (module_cache[p]) {
        return module_cache[p];
    }

    var nodes = p.split('/').slice(1);
    var content = nodes.reduce(function (a, x) {
        if (a[x] === undefined) {
            throw new Error('Could not require module: ' + target);
        }
        a = a[x];
        return a;
    }, doc);

    var sandbox = {
        module: {exports: {}},
        require: async.apply(
            exports.require, module_cache, doc, path.dirname(p)
        ),
        log: function () {
            console.log.apply(console, arguments);
        }
    };
    sandbox.exports = sandbox.module.exports;

    // copy context into sandbox
    if (context) {
        Object.keys(context).forEach(function (k) {
            sandbox[k] = context[k];
        });
    }

    try {
        var filename = utils.getPropertyPath(
            exports.originalPaths, p.substr(1), true
        );
        var s = new Script(content, filename).runInNewContext(sandbox);
    }
    catch (e) {
        //var stack = e.stack.split('\n').slice(0, 1);
        //stack = stack.concat(['\tin ' + p.slice(1)]);
        //e.stack = stack.join('\n');
        throw e;
    }
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
