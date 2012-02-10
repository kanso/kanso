/**
 * Manages version trees according to version range requirements and available
 * version sets
 */

var semver = require('semver'),
    async = require('async'),
    versions = require('./versions'),
    _ = require('underscore/underscore')._;



exports.build = function (pkg, sources, callback) {
    var packages = {};
    packages[pkg.name] = exports.createPackage([]);
    exports.extend(pkg, sources, packages, callback);
};

/**
 *
 */

exports.extend = function (pkg, sources, packages, callback) {
    if (!packages[pkg.name]) {
        packages[pkg.name] = exports.createPackage([]);
    }
    packages[pkg.name].versions[pkg.version] = pkg;
    packages[pkg.name].current_version = pkg.version;

    var dependencies = Object.keys(pkg.dependencies || {});
    // TODO: split this into a separate exported function with a better name?
    function iterator(k, cb) {
        if (!packages[k]) {
            packages[k] = exports.createPackage(sources);
        }
        var dep = packages[k];
        var curr = dep.current_version;
        dep.ranges[pkg.name] = pkg.dependencies[k];

        if (!semver.satisfies(curr, pkg.dependencies[k])) {
            var available = Object.keys(dep.versions);
            var ranges = _.values(dep.ranges);
            var match = versions.maxSatisfying(available, ranges);

            if (match) {
                dep.current_version = match;
                exports.extend(dep.versions[match], sources, packages, cb);
            }
            else if (dep.sources.length) {
                // TODO check sources
                var fn = dep.sources.shift();
                fn(k, function (err, versions) {
                    if (err) {
                        return cb(err);
                    }
                    // keep existing versions, only add new ones
                    dep.versions = _.extend(versions, dep.versions);
                    // re-run iterator with original args now there are
                    // new versions available
                    iterator(k, cb);
                });
            }
            else {
                return cb(exports.dependencyError(k, dep));
            }
        }
    }
    async.forEach(dependencies, iterator, function (err) {
        callback(err, packages);
    });
};


/**
 *
 */

exports.createPackage = function (sources) {
    return {
        versions: {},
        ranges: {},
        sources: sources.slice()
    };
};


/**
 *
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
