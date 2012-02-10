/**
 * Manages version trees according to range requirements and available
 * version sets
 */

var semver = require('semver'),
    events = require('events'),
    async = require('async'),
    versions = require('./versions'),
    _ = require('underscore/underscore')._;


/**
 * Build a new version tree.
 *
 * @param {Object} pkg - the values from kanso.json for the root package
 * @param {Array} sources - and array of functions for getting more available
 *     versions of packages. Source functions accept the package name and a
 *     callback, and should return an object containing kanso.json values keyed
 *     by version number. The second source function is only called if the first
 *     fails to satisfy the version requirements.
 * @param {Function} callback - called when processing is complete, passed an
 *     optional error as the first argument and a version tree as the second.
 *
 * Returned version tree format:
 * {
 *   foo: {
 *     versions: {'0.0.1': <kanso.json>, '0.0.2': <kanso.json>},
 *     current_version: '0.0.2',
 *     ranges: {bar: '>= 0.0.2'}
 *   },
 *   bar: {
 *     versions: {'0.0.1': <kanso.json>},
 *     current_version: '0.0.1',
 *     ranges: {}
 *   }
 * }
 */

exports.build = function (pkg, sources, callback) {
    var packages = {};
    packages[pkg.config.name] = exports.createPackage([]);
    exports.extend(pkg, sources, packages, callback);
};


/**
 * Extends a version tree with new information when a new package is added or
 * a package version changes.
 *
 * @param {Object} pkg - kanso.json values for the updated package
 * @param {Array} sources - an array of source functions (see exports.build)
 * @param {Object} packages - the existing version tree to extend
 * @param {Function} callback
 */

exports.extend = function (pkg, sources, packages, callback) {
    if (!packages[pkg.config.name]) {
        packages[pkg.config.name] = exports.createPackage([]);
    }
    packages[pkg.config.name].versions[pkg.config.version] = pkg;
    packages[pkg.config.name].current_version = pkg.config.version;

    var dependencies = Object.keys(pkg.config.dependencies || {});
    if (!dependencies.length) {
        return callback(null, packages);
    }
    // TODO: split this into a separate exported function with a better name?
    function iterator(k, cb) {
        if (!packages[k]) {
            packages[k] = exports.createPackage(sources);
        }
        var dep = packages[k];
        var curr = dep.current_version;
        dep.ranges[pkg.config.name] = pkg.config.dependencies[k];

        if (!curr || !versions.satisfiesAll(curr, Object.keys(dep.ranges))) {
            var available = Object.keys(dep.versions);
            var ranges = _.values(dep.ranges);
            var match = versions.maxSatisfying(available, ranges);

            if (match) {
                dep.current_version = match;
                exports.extend(dep.versions[match], sources, packages, cb);
            }
            else {
                return exports.updateDep(k, dep, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    // re-run iterator with original args now there are
                    // new versions available
                    return iterator(k, cb);
                });
            }
        }
    }
    async.forEach(dependencies, iterator, function (err) {
        callback(err, packages);
    });
};


exports.updateDep = function (name, dep, callback) {
    if (dep.update_in_progress) {
        return dep.ev.once('update', callback);
    }
    else if (dep.sources.length) {
        var fn = dep.sources.shift();
        if (!dep.ev) {
            dep.ev = new events.EventEmitter();
            dep.ev.setMaxListeners(10000);
        }
        dep.update_in_progress = true;

        return fn(name, function (err, versions) {
            if (err) {
                return callback(err);
            }
            // keep existing versions, only add new ones
            dep.versions = _.extend(versions, dep.versions);

            dep.update_in_progress = false;
            dep.ev.emit('update');
            // re-run iterator with original args now there are
            // new versions available
            return callback();
        });
    }
    else {
        return callback(exports.dependencyError(name, dep));
    }
};


/**
 * Creates a new empty package object for adding to the version tree
 */

exports.createPackage = function (sources) {
    return {
        versions: {},
        ranges: {},
        sources: sources.slice()
    };
};


/**
 * Creates a suitable Error when a dependency cannot be met
 */

exports.dependencyError = function (name, dep) {
    if (!Object.keys(dep.versions).length) {
        return new Error("No package for '" + name + "'");
    }
    var ranges = '';
    for (var r in dep.ranges) {
        ranges += '\t' + r + ' requires ' + dep.ranges[r] + '\n';
    }
    return new Error("No matching version for '" + name + "'\n\n" +
        "Available versions:\n\t" +
            Object.keys(dep.versions).join(", ") + '\n\n' +
        "Requirements:\n" + ranges);
};
