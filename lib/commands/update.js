var async = require('async'),
    path = require('path'),
    logger = require('../logger'),
    kansorc = require('../kansorc'),
    packages = require('../packages'),
    repository = require('../repository'),
    argParse = require('../args').parse,
    settings = require('../settings'),
    semver = require('semver');


exports.summary = 'Updates a package to the latest compatible version';


exports.usage = '' +
'kanso update [PACKAGES ...]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGES    Names of specific packages to update\n' +
'\n' +
'Options:\n' +
'  --repository   Source repository URL (otherwise uses settings in kansorc)\n' +
'  --package-dir  Package directory (defaults to "./packages")';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'repository': {match: '--repository', value: true},
        'package-dir': {match: '--package-dir', value: true}
    });

    var packages = a.positional.length ? a.positional: null;
    var repos = settings.repositories;
    if (a.options.repository) {
        repos = [a.options.repository];
    }
    var target_dir = a.options['package-dir'] || path.resolve('packages')

    repos = settings.repositories;
    if (a.options.repository) {
        repos = [a.options.repository];
    }

    exports.update(repos, settings, target_dir, packages, repos);
};


// the concurrency of fetch requests
var concurrency = 5;


exports.update = function (repos, _settings, target_dir, packages, repos) {
    var dir = process.cwd();
    kansorc.extend(_settings, dir + '/.kansorc', function (err, _settings) {
        if (err) {
            return logger.error(err);
        }
        settings.load(dir, function (err, cfg) {
            if (err) {
                return logger.error(err);
            }
            if (!cfg.dependencies) {
                logger.info('No dependencies specified');
                return logger.end();
            }
            exports.getOutdated(repos, _settings, dir, function (err, pkgs) {
            });
            /**
             * - cycle through deps in root kanso.json
             * - for each
             *   - log version requirements and current version
             *   - cycle through deps and repeat process ignoring those already
             *     parsed (use event emitter like packages.readMeta?)
             * - for the unique list of deps in tree, check available versions
             * - determine highest acceptable version according to all ranges
             *   (this process should be ported to the install command too)
             * - run "kanso install" code for each outdated package
             */
        });
    });
};


exports.getRanges = function (settings, dir, callback) {
    var pcache = {};
    var paths = settings.package_paths || [];
    packages.readMeta(pcache, dir, null, paths, null, dir, function (err) {
        return callback(err, pcache);
    });
};

exports.getOutdated = function (repos, settings, dir, callback) {
    exports.getRanges(settings, dir, function (err, pcache) {
        if (err) {
            return callback(err);
        }
        // remove root package
        var names = Object.keys(pcache).filter(function (name) {
            return name !== dir;
        });
        var outdated = [];
        logger.info('Checking for outdated packages...');

        async.forEachLimit(names, concurrency, function (k, cb) {
            console.log('Checking ' + k);
            var ranges = pcache[k].ranges;
            repository.maxSatisfying(k, ranges, repos, function (err, match) {
                if (err) {
                    return cb(err);
                }
                if (match) {
                    var current = pcache[k].cfg.version;
                    // new match greater version number than current?
                    if (semver.gt(match.version, current)) {
                        // package is outdated
                        outdated.push({
                            name: k,
                            current: current,
                            available: match.version
                        });
                        logger.info(k, current + ' => ' + match.version);
                    }
                    else {
                        logger.info(k, current + ' =downgrade=> ' + match.version);
                    }
                }
                return cb();
            });
        },
        function (err) {
            return callback(err, outdated);
        });
    });
};
