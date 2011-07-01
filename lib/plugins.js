/**
 * Module dependencies
 */

var fs = require('fs'),
    path = require('path'),
    logger = require('./logger'),
    _ = require('../deps/underscore/underscore')._;


/**
 * Extracts the available command names from an array of loaded plugin objects.
 *
 * @param {Array} plubins
 * @returns {Array}
 */

exports.commands = function (plugins) {
    return plugins.reduce(function (commands, p) {
        return _.extend(commands, p.commands);
    }, {});
};


/**
 * Loads an array of plugin paths, checking for conflicts, then returning the
 * resulting plugin objects.
 *
 * @param {Array} paths
 * @returns {Array}
 */

exports.load = function (paths) {
    var plugins = paths.map(function (path) {
        logger.debug('loading plugin', path);
        var plugin = require(path);
        plugin.__path = path;
        return plugin;
    });
    exports.checkConflicts(plugins);
    return plugins;
};


/**
 * Checks for conflicting names in an array of plugin objects, throwing an
 * exception when a conflict is detected.
 *
 * @param {Array} plugins
 */

exports.checkConflicts = function (plugins) {
    var commands = plugins.reduce(function (commands, p) {
        var c = Object.keys(p.commands).map(function (k) {
            return [k, p.__path];
        });
        return commands.concat(c);
    }, []).sort();

    for (var i = 1, len = commands.length; i < len; i++) {
        if (commands[i - 1][0] === commands[i][0]) {
            throw new Error(
                'Command "' + commands[i][0] + '" in "' +
                commands[i][1] + '" conflicts with "' +
                commands[i - 1][1] + '"'
            );
        }
    }
};


/**
 * Finds plugins within a directory, returning an array of plugin paths. This
 * is used by kanso to list the default plugins included in the kanso plugin
 * directory.
 *
 * @param {String} dir
 * @param {Function} callback
 */

exports.list = function (dir, callback) {
    fs.readdir(dir, function (err, files) {
        if (err) {
            return callback(err);
        }
        var paths = files.filter(function (f) {
            return f[0] !== '.';
        });
        var fullpaths = paths.map(function (p) {
            return path.join(dir, p).replace(/\.js$/, '');
        });
        callback(null, fullpaths);
    });
};
