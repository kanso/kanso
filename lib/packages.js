/**
 * Functions related to the finding, loading and manipulation of Kanso packages
 *
 * @module
 */

var settings = require('./settings'),
    buildsteps = require('./buildsteps'),
    async = require('../deps/async'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path'),
    semver = require('../deps/node-semver/semver'),
    _ = require('../deps/underscore/underscore')._;


/**
 * Store a list of loaded packages so we don't re-load and get conflicting
 * properties when a dependency of multiple packages.
 * Contains package paths keyed by package name.
 */

exports._loaded_packages = {};
exports._package_cache = {};


/**
 * Loads a package, passing it through all plugin preprocessors before returning
 * the resulting document.
 *
 * Each preprocessor is passed the path to the package directory, the settings
 * loaded from its kanso.json file and the document returned from the previous
 * preprocessor.
 *
 * @param {String} name - the name / path of the package to lookup
 * @param {Boolean} root - whether this is the root package
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Object} options - options to override values in package cfg
 * @param {Function} callback
 */

exports.load = function (name, root, paths, source, options, callback) {
    // TODO: clear _loaded_packages cache if root? or pass around a cache obj?
    exports.resolve(name, null, paths, source, function (err, p) {
        if (err) {
            return callback(err);
        }

        if (p in exports._package_cache) {
            var cached = exports._package_cache[p];
            return callback(null, cached.doc, cached.cfg, p, true);
        }

        paths = paths.concat([p + '/packages']);

        settings.load(p, function (err, cfg) {
            if (err) {
                return callback(err);
            }

            // extend kanso.json values with options passed from command-line
            _.extend(cfg, options);

            if (cfg.name in exports._loaded_packages &&
                p !== exports._loaded_packages[cfg.name]) {
                // module found at mutliple paths
                return callback(new Error(
                    'Conflicting packages for ' + cfg.name + ': "' +
                    p + '" and "' + exports._loaded_packages[cfg.name] + '"'
                ));
            }

            logger.info('loading', name);

            exports.loadDependencies(p, cfg, paths, source, options,
                function (err, doc, pre, post) {
                    if (err) {
                        return callback(err);
                    }
                    if (cfg.preprocessors) {
                        for (var k in cfg.preprocessors) {
                            if (!pre[cfg.name]) {
                                pre[cfg.name] = {};
                            }
                            if (!pre[cfg.name][k]) {
                                pre[cfg.name][k] = require(
                                    utils.abspath(cfg.preprocessors[k], p)
                                );
                            }
                        }
                    }
                    if (cfg.postprocessors) {
                        for (var k in cfg.postprocessors) {
                            if (!post[cfg.name]) {
                                post[cfg.name] = {};
                            }
                            if (!post[cfg.name][k]) {
                                post[cfg.name][k] = require(
                                    utils.abspath(cfg.postprocessors[k], p)
                                );
                            }
                        }
                    }
                    exports.process(pre, post, root, p, cfg, doc,
                        function (err, doc, cfg, p, already_loaded) {
                            if (err) {
                                return callback(err);
                            }
                            exports._package_cache[p] = {
                                doc: doc,
                                cfg: cfg
                            };
                            logger.debug('loaded ', cfg.name);
                            if (doc.shows) {
                                logger.debug('  shows', Object.keys(doc.shows));
                            }
                            if (doc.lists) {
                                logger.debug('  lists', Object.keys(doc.lists));
                            }
                            if (doc.updates) {
                                logger.debug(
                                    '  updates', Object.keys(doc.updates)
                                );
                            }
                            if (doc.views) {
                                logger.debug('  views', Object.keys(doc.views));
                            }
                            if (doc.rewrites) {
                                logger.debug(
                                    '  rewrites',
                                    JSON.stringify(doc.rewrites, null, 4)
                                );
                            }
                            callback.apply(this, arguments);
                        }
                    );
                }
            );
        });
    });
};

exports.loadDependencies = function (p, cfg, paths, source, options, callback) {
    var deps = Object.keys(cfg.dependencies || {}),
        post = {},
        pre = {};

    async.reduce(deps, {}, function (doc, k, cb) {
        var range = cfg.dependencies[k];
        exports.resolve(k, range, paths, source, function (err, np) {
            if (np === p) {
                return callback(new Error(
                    'Package should specify itself as a ' +
                    'dependency: ' + p
                ));
            }
            exports.load(k, false, paths, p, options,
                function (err, nd, nc, np, already_loaded) {
                    if (err) {
                        return cb(err);
                    }
                    if (nc.preprocessors) {
                        for (var k in nc.preprocessors) {
                            if (!pre[nc.name]) {
                                pre[nc.name] = {};
                            }
                            if (!pre[nc.name][k]) {
                                pre[nc.name][k] = require(
                                    utils.abspath(nc.preprocessors[k], np)
                                );
                            }
                        }
                    }
                    if (nc.postprocessors) {
                        for (var k in nc.postprocessors) {
                            if (!post[nc.name]) {
                                post[nc.name] = {};
                            }
                            if (!post[nc.name][k]) {
                                post[nc.name][k] = require(
                                    utils.abspath(nc.postprocessors[k], np)
                                );
                            }
                        }
                    }
                    if (already_loaded) {
                        return cb(null, doc);
                    }
                    cb(null, exports.merge(doc, nd));
                }
            );
        });
    },
    function (err, doc) {
        if (err) {
            return callback(err);
        }
        callback(null, doc, pre, post);
    });
};

exports.preprocess = function (pre, root, p, cfg, doc, callback) {
    var errs = [];
    var bm = new buildsteps.BuildManager([root, p, cfg], doc);
    bm.addAll(pre);
    bm.on('error', function (err, step) {
        errs.push({err: err, step: step});
    });
    bm.on('beforeStep', function (pkg, name) {
        if (root) {
            logger.info('preprocessor', pkg + '/' + name);
        }
        logger.debug(cfg.name + ' - starting preprocessor', pkg + '/' + name);
    });
    bm.on('step', function (pkg, name) {
        logger.debug(cfg.name + ' - completed preprocessor', pkg + '/' + name);
    });
    bm.on('end', function (doc, complete, incomplete) {
        if (errs.length) {
            errs.forEach(function (e) {
                logger.error(
                    'Error when running preprocessor: "' +
                    e.step.toString() + '"'
                );
                //logger.error(e.err);
            });
            return callback(errs[0].err);
        }
        if (incomplete.length) {
            incomplete.forEach(function (s) {
                logger.warning('Preprocessor failed to run: ' + s.toString());
            });
        }
        return callback(null, doc);
    });
    bm.run();
};

exports.postprocess = function (post, root, p, cfg, doc, callback) {
    var errs = [];
    var bm = new buildsteps.BuildManager([root, p, cfg], doc);
    bm.addAll(post);
    bm.on('error', function (err, step) {
        errs.push({err: err, step: step});
    });
    bm.on('beforeStep', function (pkg, name) {
        if (root) {
            logger.info('postprocessor', pkg + '/' + name);
        }
    });
    bm.on('step', function (pkg, name) {
        logger.debug('completed postprocessor', pkg + '/' + name);
    });
    bm.on('end', function (doc, complete, incomplete) {
        if (errs.length) {
            logger.error(
                'Error when running postprocessor: "' +
                errs[0].step.toString() + '"'
            );
            // this gets displayed by the command running package.load
            //logger.error(errs[0].err);
            return callback(errs[0].err);
        }
        else if (incomplete.length) {
            incomplete.forEach(function (s) {
                logger.warning('Postprocessor failed to run: ' + s.toString());
            });
        }
        callback(null, doc);
    });
    bm.run();
};

exports.process = function (pre, post, root, p, cfg, doc, callback) {
    exports.preprocess(pre, root, p, cfg, doc, function (err, doc) {
        if (err) {
            return callback(err);
        }
        exports._loaded_packages[cfg.name] = p;
        if (root) {
            // run post-processors on merged document
            exports.postprocess(post, root, p, cfg, doc, function (err, doc) {
                callback(err, utils.stringifyFunctions(doc), cfg, p, false);
            });
        }
        else {
            callback(err, utils.stringifyFunctions(doc), cfg, p, false);
        }
    });
};

exports.maxlen = function (val, len) {
    if (typeof val === 'string' || Array.isArray(val)) {
        if (val.length > len) {
            return val.substr(0, len) + '...';
        }
    }
    return val;
};


exports.merge = function (a, b, /*optional*/path) {
    a = a || {};
    b = b || {};
    path = path || [];

    for (var k in b) {
        if (typeof b[k] === 'object' && !Array.isArray(b[k])) {
            a[k] = exports.merge(a[k], b[k], path.concat([k]));
        }
        else {
            if (a[k] && a[k] !== b[k]) {
                throw new Error(
                    'Conflicting property at: ' + path.concat([k]).join('.') +
                    '\nBetween: ' +
                    exports.maxlen(JSON.stringify(a[k]), 30) + ' and ' +
                    exports.maxlen(JSON.stringify(b[k]), 30)
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
 * @param {String} range - a version or range of versions to match against
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Function} callback
 */

exports.resolve = async.memoize(function (name, range, paths, source, callback) {
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
    var matches = {};
    // TODO: make this parallel (but still need to respect order of paths)
    async.forEachSeries(candidates, function (c, cb) {
        path.exists(path.join(c, 'kanso.json'), function (exists) {
            if (exists) {
                settings.load(c, function (err, cfg) {
                    if (err) {
                        return cb(err);
                    }
                    // keep existing matches (which have higher priority when
                    // respecting order of paths array)
                    if (!matches[cfg.version]) {
                        matches[cfg.version] = c;
                    }
                    cb();
                });
            }
            else {
                cb();
            }
        });
    },
    function (err) {
        if (err) {
            return callback(err);
        }
        var versions = Object.keys(matches);
        var highest = semver.maxSatisfying(versions, range);
        if (highest) {
            return callback(null, matches[highest]);
        }
        if (versions.length) {
            return callback(new Error(
                "Cannot find package '" + name + "' matching " + range + "\n" +
                "Available versions: " + versions.join(', ')
            ));
        }
        else {
            return callback(new Error("Cannot find package '" + name + "'"));
        }
    });
});
