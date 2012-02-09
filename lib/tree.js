/**
 * Manages version trees according to version range requirements and available
 * version sets
 */

var semver = require('semver'),
    versions = require('./versions'),
    _ = require('underscore/underscore')._;


/**
 *
 */

exports.build = function (pkg, sources, /*optional*/packages) {
    packages || (packages = {});

    if (!packages[pkg.name]) {
        packages[pkg.name] = exports.createPackage(sources);
    }
    packages[pkg.name].versions[pkg.version] = pkg;
    packages[pkg.name].current_version = pkg.version;

    for (var k in (pkg.dependencies || {})) {
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
                exports.build(dep.versions[match], sources, packages);
            }
            else if (dep.sources.length) {
                // TODO check sources
                throw new Error('not implemented');
            }
            else {
                exports.throwDependencyError(k, dep);
            }
        }
    }
    return packages;
}


/**
 *
 */

exports.createPackage = function (sources) {
    return {
        versions: {},
        ranges: {},
        sources: sources
    };
};


/**
 *
 */

exports.throwDependencyError = function (name, dep) {
    if (!Object.keys(dep.versions).length) {
        throw new Error("No package for '" + name + "'");
    }
    var ranges = '';
    for (var r in dep.ranges) {
        ranges += '\t' + r + ' requires ' + dep.ranges[r] + '\n';
    }
    throw new Error("No matching version for '" + name + "'\n\n" +
        "Available versions:\n\t" +
            Object.keys(dep.versions).join(", ") + '\n\n' +
        "Requirements:\n" + ranges);
};
