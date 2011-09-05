/**
 * This module handles the loading of the kansorc files used to configure the
 * behaviour of the command-line tool.
 *
 * @module
 */

var utils = require('./utils'),
    async = require('../deps/async'),
    _ = require('../deps/underscore/underscore')._,
    path = require('path');


/**
 * Default paths to lookup when constructing values for kansorc.
 * Paths are checked in order, with later paths overriding the values obtained
 * from earlier ones.
 */

exports.PATHS = [
    '/etc/kansorc',
    '/usr/local/etc/kansorc',
    '~/.kansorc'
];

/**
 * The defaults kansorc settings
 */

exports.DEFAULTS = {
    repositories: {
        //"default": "http://kan.so/repository"
        //"default": "http://kanso.iriscouch.com/repository"
        "default": "http://localhost:5984/repository"
    }
};


/**
 * Loads kansorc settings from PATHS, and merges them along with the DEFAULT
 * values, returning the result.
 *
 * @param {Function} callback
 */

exports.load = function (callback) {
    async.map(exports.PATHS, exports.loadFile, function (err, results) {
        callback(null, exports.merge(results));
    });
};


/**
 * Merges an array of kansorc configuration objects. The merge is shallow and
 * will not recurse through sub-objects or arrays.
 *
 * @param {Array} results
 * @returns {Array}
 */

exports.merge = function (results) {
    var defaults = _.clone(exports.DEFAULTS);
    return results.reduce(function (merged, r) {
        return _.extend(merged, r);
    }, defaults);
};


/**
 * Checks a kansorc file exists and loads it if available. If the file does not
 * exist the function will respond with an empty object.
 *
 * @param {String} p - the path of the kansorc file to load
 * @param {Function} callback
 */

exports.loadFile = function (p, callback) {
    path.exists(p, function (exists) {
        if (exists) {
            utils.readJSON(p, callback);
        }
        else {
            callback(null, {});
        }
    });
};
