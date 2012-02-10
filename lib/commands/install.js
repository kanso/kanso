var semver = require('semver'),
    versions = require('../versions'),
    logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
    kansorc = require('../kansorc'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    tar = require('../tar'),
    tree = require('../tree'),
    async = require('async'),
    path = require('path'),
    fs = require('fs');


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
'  kanso install <name>@<tag>\n' +
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
            return exports.installRepo(pkg, opt, callback);
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
        var pdir = path.join(target_dir, name);
        path.exists(pdir + '/kanso.json', function (exists) {
            if (exists) {
                settings.load(pdir, function (err, cfg) {
                    if (err) {
                        return callback(err);
                    }
                    var versions = {};
                    versions[cfg.version] = cfg;
                    return callback(null, versions);
                });
            }
            else {
                return callback(null, {});
            }
        });
    };
};


exports.repoSource = function (repositories) {
    return function (name, callback) {
        repository.availableVersions(name, repositories, function (err, vers) {
            if (err) {
                return callback(err);
            }
            var versions = {};
            for (var k in vers) {
                // TODO: have tree module accept .cfg property instead?
                versions[k] = vers[k].cfg;
            }
            return callback(null, versions);
        });
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
            tree.build(cfg, sources, function (err, packages) {
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
        exports.installRepo(name, curr, opt, callback);
    }, callback);
};

exports.installRepo = function (name, /*optional*/range, opt, callback) {
    if (!callback) {
        // arity 3
        callback = opt;
        opt = range;
        range = null;
    }
    if (!range) {
        if (name.indexOf('@') !== -1) {
            var parts = name.split('@');
            name = parts[0];
            range = parts.slice(1).join('@');
        }
        else {
            range = 'latest';
        }
    }
    repository.fetch(name, range, opt.repositories,
        function (err, tfile, cdir, v, cfg, from_cache) {
            if (err) {
                return callback(err);
            }
            logger.info(
                'installing',
                name + '@' + v + (from_cache ? ' (cached)': '')
            );
            exports.cpDir(name, cdir, opt, callback);
        }
    );
};

exports.cpDir = function (name, cdir, opt, callback) {
    var p = opt.target_dir + '/' + name;
    function cp() {
        utils.ensureDir(opt.target_dir, function (err) {
            if (err) {
                return callback(err);
            }
            logger.info('copying', cdir + ' => ' + p);
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
