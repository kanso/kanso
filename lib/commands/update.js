/**
 * Module dependencies
 */

var path = require('path'),
    semver = require('semver'),
    install = require('./install'),
    tree = require('../tree');
    utils = require('../utils'),
    logger = require('../logger'),
    argParse = require('../args').parse,
    _ = require('underscore/underscore')._;


/**
 * Usage information and docs
 */

exports.summary = 'Updates a package to the latest compatible version';


exports.usage = '' +
'kanso update [PACKAGES ...]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGES    Names of specific packages to update\n' +
'\n' +
'Options:\n' +
'  --repository   Source repository URL (otherwise uses values in kansorc)\n' +
'  --package-dir  Package directory (defaults to "./packages")';


/**
 * Run function called when "kanso update" command is used
 *
 * @param {Object} settings - the values from .kansorc files
 * @param {Array} args - command-line arguments
 */

exports.run = function (settings, args) {
    var a = argParse(args, {
        'repository': {match: '--repository', value: true},
        'target_dir': {match: '--package-dir', value: true}
    });

    var opt = a.options;
    var deps = a.positional;

    opt.target_dir = opt.target_dir || utils.abspath('packages');
    opt.repositories = settings.repositories;
    if (a.options.repository) {
        opt.repositories = [a.options.repository];
        // don't allow package dir .kansorc file to overwrite repositories
        opt.fixed_repositories = true;
    }
    exports.update(deps, opt, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end();
    });
};


/**
 * Update the current project directory's dependencies.
 *
 * @param {Array} deps - an optional sub-set of package names to update
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.update = function (deps, opt, callback) {
    install.initDir('.', opt, function (err, opt, cfg) {
        if (err) {
            return callback(err);
        }
        exports.getOutdated(cfg, opt, function (err, packages) {
            if (err) {
                return callback(err);
            }
            if (deps.length) {
                packages = packages.filter(function (dep) {
                    return (_.indexOf(deps, dep.name) !== -1);
                });
            }
            exports.installChanges(packages, opt, callback);
        });
    });
};


/**
 * Builds a remote and a local copy of the version tree. This is used to compare
 * the installed packages against those that are available in the repositories.
 *
 * @param {Object} cfg - values from kanso.json for the root package
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.buildTrees = function (cfg, opt, callback) {
    var local_sources = [
        install.dirSource(opt.target_dir)
    ];
    var pkg = {
        config: cfg,
        source: 'root'
    };
    logger.info('Building local version tree...');
    tree.build(pkg, local_sources, function (err, local_packages) {
        if (err) {
            return callback(err);
        }
        var all_sources = [
            // check remote source first to make sure we get highest version
            install.repoSource(opt.repositories),
            install.dirSource(opt.target_dir)
        ];
        logger.info('Building remote version tree...');
        tree.build(pkg, all_sources, function (err, remote_packages) {
            // TODO: modify local tree with filtered list of packages to update
            // (provided on the command line) so that we can work out the
            // changes that are dependencies of this filtered package list.
            // Currently, doing "kanso update db" wouldn't update, for example
            // the modules package if it was required by the new version of 'db'
            callback(err, local_packages, remote_packages);
        });
    });
};


/**
 * Gets the remote and local version trees, compares the version numbers for
 * each package, and returns a list of packages which have changed.
 *
 * Each objects in the returned list of changed packages have the following
 * properties:
 *
 * - name - the name of the package
 * - version - the new version to be installed
 * - old - the old version to be installed (null if it doesn't currently exist)
 *
 * @param {Object} cfg - the values from kanso.json for the root package
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.getOutdated = function (cfg, opt, callback) {
    exports.buildTrees(cfg, opt, function (err, local, remote) {
        if (err) {
            return callback(err);
        }
        var all_names = _.uniq(_.keys(local).concat(_.keys(remote)));

        var changed = all_names.map(function (name) {
            var lversion = local[name] ? local[name].current_version: null;
            var rversion = remote[name].current_version;

            if (!local[name] && remote[name] || lversion !== rversion) {
                return {name: name, version: rversion, old: lversion};
            }
        });
        callback(null, _.compact(changed));
    });
};


/**
 * Accepts an array of changed packages and reports the change to the console
 * then installs from the repositories.
 *
 * @param {Array} packages - array of changed packages
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.installChanges = function (packages, opt, callback) {
    async.forEachLimit(packages, 5, function (dep, cb) {
        if (!dep.old) {
            logger.info('new package', dep.name + '@' + dep.version);
        }
        else if (semver.lt(dep.old, dep.version)) {
            logger.info(
                'update package',
                dep.name + '@' + dep.old + ' => ' + dep.name + '@' + dep.version
            );
        }
        else if (semver.gt(dep.old, dep.version)) {
            logger.info(
                'downgrade package',
                dep.name + '@' + dep.old + ' => ' + dep.name + '@' + dep.version
            );
        }
        install.installRepo(dep.name, dep.version, opt, cb);
    }, callback);
};
