/**
 * Functions related to the finding, loading and manipulation of Kanso packages
 *
 * @module
 */

var settings = require('./settings'),
    plugins_module = require('./plugins'),
    async = require('../deps/async'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path');


/**
 * Store a list of loaded packages so we don't re-load and get conflicting
 * properties when a dependency of multiple packages.
 * Contains package paths keyed by package name.
 */

exports._loaded_packages = {};


/**
 * Loads a package, passing it through all plugin preprocessors before returning
 * the resulting document.
 *
 * Each preprocessor is passed the path to the package directory, the settings
 * loaded from its kanso.json file and the document returned from the previous
 * preprocessor.
 *
 * @param {Array} plugins
 * @param {String} name - the name / path of the package to lookup
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Function} callback
 */

exports.load = function (plugins, name, root, paths, source, callback) {
    exports.resolve(name, paths, source, function (err, p) {
        if (err) {
            return callback(err);
        }
        settings.load(p, function (err, cfg) {
            if (err) {
                return callback(err);
            }
            if (cfg.name in exports._loaded_packages) {
                if (p !== exports._loaded_packages[cfg.name]) {
                    // module found at mutliple paths
                    return callback(new Error(
                        'Conflicting packages for ' + cfg.name + ': "' +
                        p + '" and "' + exports._loaded_packages[cfg.name] + '"'
                    ));
                }
                // return empty object instead of a cached package because
                // otherwise the attempted merge will result in conflicting
                // properties
                return callback(null, {}, cfg, p);
            }
            logger.info('loading package', name);
            var deps = Object.keys(cfg.dependencies || {});
            async.reduce(deps, {}, function (doc, k, cb) {
                exports.load(plugins, k, false, paths, p,
                    function (err, nd, nc, np) {
                        if (err) {
                            return cb(err);
                        }
                        var pre = plugins_module.preprocessors(plugins);
                        exports.process(pre, false, np, nc, nd,
                            function (err, nd, nc) {
                                if (err) {
                                    return cb(err);
                                }
                                cb(null, exports.merge(doc, nd));
                            }
                        );
                    }
                );
            },
            function (err, doc) {
                if (err) {
                    return callback(err);
                }
                var pre = plugins_module.preprocessors(plugins);
                exports.process(pre, root, p, cfg, doc, callback);
            });
        });
    });
};

exports.process = function (preprocessors, root, p, cfg, doc, callback) {
    async.reduce(preprocessors, doc, function (doc, fn, cb) {
        fn(root, p, cfg, doc, cb);
    },
    function (err, doc) {
        exports._loaded_packages[cfg.name] = p;
        callback(err, utils.stringifyFunctions(doc), cfg, p);
    });
};


exports.merge = function (a, b, /*optional*/path) {
    a = a || {};
    b = b || {};
    path = path || [];

    for (var k in b) {
        if (k === '_wrapped_modules' && path.length === 0) {
            a._wrapped_modules += b._wrapped_modules;
        }
        else if (typeof b[k] === 'object') {
            a[k] = exports.merge(a[k], b[k], path.concat([k]));
        }
        else {
            if (a[k] && a[k] !== b[k]) {
                throw new Error(
                    'Conflicting property: ' + path.concat([k]).join('.')
                );
            }
            a[k] = b[k];
        }
    }
    return a;
};


/**
 * Looks up the path to a specified package, returning an error if not found.
 *
 * @param {String} name - the name / path of the package to lookup
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Function} callback
 */

exports.resolve = function (name, paths, source, callback) {
    souce = source || process.cwd();
    var candidates = [];
    if (name[0] === '/') {
        // absolute path to a specific package directory
        candidates.push(name);
    }
    else if (name[0] === '.') {
        // relative path to a specific package directory
        candidates.push(path.normalize(path.join(source, name)));
    }
    else {
        candidates = candidates.concat(paths.map(function (dir) {
            return path.join(dir, name);
        }));
    }
    async.forEachSeries(candidates, function (c, cb) {
        path.exists(path.join(c, 'kanso.json'), function (exists) {
            if (exists) {
                return callback(null, c);
            }
            cb();
        });
    },
    function () {
        return callback(new Error("Cannot find package '" + name + "'"));
    });
};
