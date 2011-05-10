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
        exports.addFiles(dir, files, doc, function (err) {
            exports.addKansoModules(doc, callback);
        });
    });
};

exports.addKansoModules = function (doc, callback) {
    var default_dir = path.normalize(__dirname + '/../commonjs');

    exports.findKansoModules(function (err, files) {
        if (err) {
            return callback(err);
        }
        exports.addFiles(default_dir, files, doc, callback);
    });
};

exports.findKansoModules = function (callback) {
    var default_dir = path.normalize(__dirname + '/../commonjs');
    exports.find(default_dir, default_dir, function (err, files) {
        if (err) {
            return callback(err);
        }
        if (!files.length) {
            return callback(new Error(
                'Couldn\'t find kanso core commonjs modules in: ' +
                default_dir
            ));
        }
        try {
            // strip out auto-generated modules
            files = files.filter(function (f) {
                return (
                    f !== default_dir + '/kanso/templates.js' &&
                    f !== default_dir + '/kanso/settings.js'
                );
            });
        }
        catch (e) {
            callback(e);
        }
        callback(null, files);
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
        var module_path = rel.replace(/\.js$/, '');
        var src = content.toString();
        utils.setPropertyPath(doc, rel, src);
        utils.setPropertyPath(exports.originalPaths, rel, file);
        exports.wrap(doc, module_path, src);

        callback();
    });
};

exports.wrap = function (doc, module_path, src) {
    // wrap the module and add as an attachment
    var wrapped = '/********** ' + module_path + ' **********/\n\n' +
        'kanso.moduleCache["' +
            module_path.replace('"', '\\"') +
        '"] = {load: (function (module, exports, require) {\n\n' +
            src +
        '\n\n})};\n\n';

    if (!doc._attachments) {
        doc._attachments = {};
    }
    if (!doc.hasOwnProperty('_wrapped_modules')) {
        doc._wrapped_modules = '';
    }
    doc._wrapped_modules += wrapped;
    // doc._wrapped_modules is appended to kanso.js and base64 encoded
    // in lib/app.js
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
        // should have a .js extension
        if (!/\.js$/.test(f)) {
            return false;
        }
        return true;
    };
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

    // Create a placeholder for this module's exports so circular requires
    // are possible. TODO: node.js uses a loaded = false attribute on the
    // cached module object to mark this as a placeholder.
    module_cache[p] = {};

    var filename;
    try {
        filename = utils.getPropertyPath(
            exports.originalPaths, p.substr(1), true
        );
        var s = new Script(content, filename).runInNewContext(sandbox);
    }
    catch (e) {
        if (e instanceof SyntaxError && filename) {
            // gives a better syntax error than runInNewContext
            // with filename and line number
            require(filename);
        }
        else {
            throw e;
        }
    }
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
