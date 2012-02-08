/**
 * Utilities for dealing with package versions
 */

var semver = require('semver');


/**
 * Reduces an array of documents with a 'versions' property to a single object
 * containing a unique set of version number properties, respecting order (so
 * documents further down the array don't override existing version matches).
 *
 * This function is used by packages.availableVersions and
 * repository.availableVersions to reduce the complete list of version numbers
 * so that only the highest priority source for each version is returned.
 *
 * @param {Array} results - an array of objects including a 'doc' property
 * @returns {Object}
 */

exports.reduceVersions = function (results) {
    return results.reduce(function (versions, r) {
        if (!r || !r.doc || !r.doc.versions) {
            return versions;
        }
        for (var v in r.doc.versions) {
            // keep existing matches (which have higher priority when
            // respecting order of sources)
            if (!versions[v]) {
                versions[v] = r;
            }
        }
        return versions;
    }, {});
};


/**
 * Sorts an array of version numbers in descending semver order (highest
 * version number first). This is an alternative to semver.rcompare since it
 * doesn't appear to work as expected.
 *
 * @param {Array} versions - an array of version number strings
 * @returns {Array}
 */

exports.sortDescending = function (versions) {
    // for some reason semver.rcompare doesn't work
    return versions.slice().sort(semver.compare).reverse();
};


/**
 * Returns the highest version number in an array.
 *
 * @param {Array} versions - an array of version number strings
 * @returns {String}
 */

exports.max = function (versions) {
    return exports.sortDescending(versions)[0];
};


/**
 * Checks an array of range requirements against an array of available versions,
 * returning the highest version number that satisfies all ranges or null if
 * all ranges can't be satisfied.
 *
 * @param {Array} versions - an array of version strings
 * @param {Array} ranges - an array of range strings
 * @returns {String|null}
 */

exports.maxSatisfying = function (versions, ranges) {
    var satisfying = versions.filter(function (v) {
        return exports.satisfiesAll(v, ranges);
    });
    return satisfying.length ? exports.max(satisfying): null;
};


/**
 * Checks if a version number satisfies an array of range requirements.
 *
 * @param {String} version - a semver version string
 * @param {Array} ranges - an array of range strings
 * @returns {Boolean}
 */

exports.satisfiesAll = function (version, ranges) {
    return ranges.every(function(r) {
        // if range is null, everything satisfies it
        return !r || semver.satisfies(version, r);
    });
};
