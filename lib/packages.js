/**
 * Functions related to the finding, loading and manipulation of Kanso packages
 *
 * @module
 */

var settings = require('./settings'),
    plugins_module = require('./plugins'),
    async = require('../deps/async'),
    path = require('path');


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

exports.load = function (plugins, name, paths, source, callback) {
    exports.resolve(name, paths, source, function (err, p) {
        if (err) {
            return callback(err);
        }
        settings.load(p, function (err, cfg) {
            if (err) {
                return callback(err);
            }
            var preprocessors = plugins_module.preprocessors(plugins);
            async.reduce(preprocessors, {}, function (doc, fn, cb) {
                fn(true, p, cfg, doc, cb);
            },
            function (err, doc) {
                callback(err, doc, cfg);
            });
        });
    });
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
