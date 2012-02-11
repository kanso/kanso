var semver = require('semver'),
    versions = require('../versions'),
    logger = require('../logger'),
    utils = require('../utils'),
    packages = require('../packages'),
    repository = require('../repository'),
    kansorc = require('../kansorc'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    tar = require('../tar'),
    tree = require('../tree'),
    async = require('async'),
    path = require('path'),
    fs = require('fs');


/**
 * TODO: before installing from file, be sure to manually add an entry to the
 * version tree for that file otherwise when building the initial tree it might
 * complain if the file is not in the repositories.
 *
 * Can test this by packing vertest/packages/testpkg1, removing and trying to
 * install from the .tar.gz file
 *
 * TODO: review comments in tree module since the apis might have changed
 * slightly
 *
 * TODO: refactor this module now because it won't get done otherwise
 */


exports.summary = 'Installs a package and its dependencies';

exports.usage = '' +
'kanso install [PACKAGE]\n' +
'\n' +
'The PACKAGE argument can be one of the following: \n' +
'  kanso install (with no args in a package or project dir)\n' +
'  kanso install <tarball file>\n' +
'  kanso install <tarball url>\n' +
'  kanso install <folder>\n' +
'  kanso install <name>\n' +
//'  kanso install <name>@<tag>\n' +
'  kanso install <name>@<version>\n' +
'  kanso install <name>@<version range>\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE    Package to install (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --force, -f    Overwrite existing packages in target directory\n' +
'  --repository   Source repository URL (otherwise uses settings in kansorc)\n' +
'  --package-dir  Output directory (defaults to "./packages")\n' +
'  --no-deps      Don\'t fetch dependencies for the package';


/**
 * Run function called when "kanso install" command is used
 *
 * @param {Object} settings - the values from .kansorc files
 * @param {Array} args - command-line arguments
 */

exports.run = function (settings, args) {
    var a = argParse(args, {
        'repository': {match: '--repository', value: true},
        'force': {match: ['-f', '--force']},
        'target_dir': {match: '--package-dir', value: true},
        'no_deps': {match: '--no-deps'}
    });

    var opt = a.options;
    var pkg = a.positional[0] || '.';

    opt.repositories = settings.repositories;
    if (a.options.repository) {
        opt.repositories = [a.options.repository];
        // don't allow package dir .kansorc file to overwrite repositories
        opt.fixed_repositories = true;
    }
    exports.install(pkg, opt, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end();
    });
};


/**
 * Install a package from repository, file, directory or URL.
 *
 * @param {String} pkg - the package name, filename, directory or URL
 * @param {Object} opt - options such as target_dir and repositories
 * @param {Function} callback
 */

exports.install = function (pkg, opt, callback) {
    if (/^https?:\/\//.test(pkg)) {
        opt.target_dir = opt.target_dir || utils.abspath('packages');
        logger.info('installing from URL', pkg);
        return exports.installURL(pkg, opt, callback);
    }
    fs.stat(pkg, function (err, stats) {
        if (err) {
            // may not be a file
            opt.target_dir = opt.target_dir || utils.abspath('packages');
            logger.info('installing from repositories', pkg);
            return exports.installName(pkg, opt, callback);
        }
        if (stats.isDirectory()) {
            opt.target_dir = opt.target_dir || utils.abspath('packages', pkg);
            logger.info('installing from directory', pkg);
            return exports.installDir(pkg, opt, callback);
        }
        else if (stats.isFile()) {
            opt.target_dir = opt.target_dir || utils.abspath('packages');
            logger.info('installing from local file', pkg);
            return exports.installFile(pkg, opt, callback);
        }
        else {
            return callback(new Error('Unknown install target: ' + pkg));
        }
    });
};


// check packages already in local target_dir
exports.dirSource = function (target_dir) {
    return function (name, callback) {
        // TODO: also check package_paths (not just target_dir) for available
        // versions?
        packages.availableVersions([path.join(target_dir, name)], callback);
    };
};


exports.repoSource = function (repositories) {
    return function (name, callback) {
        logger.info('checking', name);
        repository.availableVersions(name, repositories, callback);
    };
};


/**
 * Install a dependencies for a package directory. Reads the .kansorc and
 * kanso.json files for that project and checks it's dependencies.
 *
 * @param {String} dir - the directory the install dependencies for
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.installDir = function (dir, opt, callback) {
    if (opt.no_deps) {
        return callback();
    }
    kansorc.loadFile(dir + '/.kansorc', function (err, _settings) {
        if (err) {
            return logger.error(err);
        }
        if (_settings.repositories && !opt.fixed_repositories) {
            // overwrite repository list with package directory's list
            opt.repositories = _settings.repositories;
        }
        settings.load(dir, function (err, cfg) {
            if (err) {
                return callback(err);
            }
            if (!cfg.dependencies) {
                logger.info('No dependencies specified');
                return callback();
            }
            var sources = [
                exports.dirSource(opt.target_dir),
                exports.repoSource(opt.repositories)
            ];
            var pkg = {config: cfg, source: 'root'}
            logger.info('Building version tree...');
            tree.build(pkg, sources, function (err, packages) {
                if (err) {
                    return callback(err);
                }
                exports.installTree(packages, opt, callback);
            });
        });
    });
};

exports.installTree = function (packages, opt, callback) {
    var names = Object.keys(packages);
    async.forEachLimit(names, 5, function (name, cb) {
        var curr = packages[name].current_version;
        if (packages[name].versions[curr].source === 'repository') {
            exports.installRepo(name, curr, opt, cb);
        }
        else if (packages[name].versions[curr].source === 'tmp') {
            var v = packages[name].versions[curr];
            logger.info('copying files', v.basename);
            exports.cpDir(name, curr, false, v.path, opt, cb);
        }
        else {
            process.nextTick(cb);
        }
    }, callback);
};

exports.installName = function (name, opt, callback) {
    var range = null;
    if (!range && name.indexOf('@') !== -1) {
        var parts = name.split('@');
        name = parts[0];
        range = parts.slice(1).join('@');
    }
    kansorc.loadFile('.kansorc', function (err, _settings) {
        if (err) {
            return logger.error(err);
        }
        if (_settings.repositories && !opt.fixed_repositories) {
            // overwrite repository list with package directory's list
            opt.repositories = _settings.repositories;
        }
        settings.load('.', function (err, cfg) {
            if (err) {
                return callback(err);
            }
            var sources1 = [
                // TODO: should this use other package_paths too?
                exports.dirSource(opt.target_dir),
                exports.repoSource(opt.repositories)
            ];
            var pkg1 = {
                config: cfg,
                source: 'root'
            };
            logger.info('Building version tree...');
            tree.build(pkg1, sources1, function (err, packages) {
                if (err) {
                    return callback(err);
                }
                var sources2 = [
                    // TODO: should this use other package_paths too?
                    exports.dirSource(opt.target_dir),
                    exports.repoSource(opt.repositories)
                ];
                tree.addDependency(
                    cfg.name, name, range, sources2, packages,
                    function (err, packages) {
                        if (err) {
                            return callback(err);
                        }
                        exports.installTree(packages, opt, callback);
                    }
                );
            });
        });
    });
};

exports.installRepo = function (name, range, opt, callback) {
    repository.fetch(name, range, opt.repositories,
        function (err, tfile, cdir, v, cfg, from_cache) {
            if (err) {
                return callback(err);
            }
            exports.cpDir(name, v, from_cache, cdir, opt, callback);
        }
    );
};

exports.cpDir = function (name, v, from_cache, cdir, opt, callback) {
    var p = opt.target_dir + '/' + name;
    function cp() {
        logger.info(
            'installing',
            name + '@' + v + (from_cache ? ' (cached)': '')
        );
        utils.ensureDir(opt.target_dir, function (err) {
            if (err) {
                return callback(err);
            }
            utils.cp('-r', cdir, p, function (err) {
                return callback(err);
            });
        });
    }
    path.exists(p, function (exists) {
        if (exists) {
            logger.info('removing', name);
            utils.rm('-rf', p, function (err) {
                if (err) {
                    return callback(err);
                }
                process.nextTick(function () {
                    cp();
                });
            });
        }
        else {
            cp();
        }
    });
};


exports.installFile = function (filename, opt, callback) {
    var tmp = repository.TMP_DIR + '/' + path.basename(filename);
    var tmp_extracted = repository.TMP_DIR + '/package';

    // clean up tmp dir after attempted install, even if error
    var _callback = callback;
    var callback = function (err) {
        var args = arguments;
        var that = this;
        utils.rm('-rf', [tmp, tmp_extracted], function (err2) {
            if (err2) {
                logger.error(err2);
            }
            _callback.apply(that, args);
        });
    };

    async.series({
        tmpdir: async.apply(utils.ensureDir, repository.TMP_DIR),
        dir: async.apply(utils.ensureDir, opt.target_dir),
        cp: function (cb) {
            if (filename === tmp) {
                // installing from a file in tmp already
                return cb();
            }
            utils.cp('-r', filename, tmp, cb);
        },
        extract: async.apply(tar.extract, tmp),
        cfg: async.apply(settings.load, tmp_extracted)
    },
    function (err, results) {
        if (err) {
            return callback(err);
        }
        var v = results.cfg.version;
        var name = results.cfg.name;

        kansorc.loadFile('.kansorc', function (err, _settings) {
            if (err) {
                return logger.error(err);
            }
            if (_settings.repositories && !opt.fixed_repositories) {
                // overwrite repository list with package directory's list
                opt.repositories = _settings.repositories;
            }
            settings.load('.', function (err, cfg) {
                if (err) {
                    return callback(err);
                }
                var sources = [
                    exports.dirSource(opt.target_dir),
                    exports.repoSource(opt.repositories)
                ];
                var packages = {};
                packages[name] = tree.createPackage([]);
                packages[name].versions[results.cfg.version] = {
                    source: 'tmp',
                    path: tmp_extracted,
                    basename: path.basename(filename),
                    config: results.cfg
                };
                var root = {config: cfg, source: 'root'}
                logger.info('Building version tree...');
                tree.extend(root, sources, packages, function (err, packages) {
                    if (err) {
                        return callback(err);
                    }
                    exports.installTree(packages, opt, callback);
                });
            });
        });
    });
};
