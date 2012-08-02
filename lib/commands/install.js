/**
 * Module dependencies
 */

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
    clean = require('./clean'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    pathExists = fs.exists || path.exists;


/**
 * Usage information and docs
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
'  kanso install <name>@<version>\n' +
'  kanso install <name>@<version range>\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE    Package to install (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --repository   Source repository URL (otherwise uses values in kansorc)\n' +
'  --package-dir  Output directory (defaults to "./packages")';


/**
 * Run function called when "kanso install" command is used
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


/**
 * Creates a source function to check packages already in local target_dir.
 * This can be used in conjunction with the tree module.
 *
 * @param {String} target_dir - the directory we're installing packages to
 * @returns {Function}
 */

// TODO: also check package_paths (not just target_dir) for available versions?
exports.dirSource = function (target_dir) {
    return function (name, callback) {
        packages.availableVersions([path.join(target_dir, name)], callback);
    };
};


/**
 * Creates a source function to check repostories for available package
 * versions. This can be used in conjunction with the tree module.
 *
 * @param {Array} repositories - URLs for repositories to check
 * @returns {Function}
 */

exports.repoSource = function (repositories) {
    return function (name, callback) {
        logger.info('checking', name);
        repository.availableVersions(name, repositories, callback);
    };
};


/**
 * Initialise actions for a specific directory, loads .kansorc and updates
 * repositories in the opt object, then loads kanso.json for the directory
 * and returns it to the callback.
 *
 * @param {String} dir - the directory of the project/package to load
 * @param {Object} opt - the options object to update repositories on
 * @param {Function} callback - the callback is passed the updated opt object
 *     and the values from kanso.json on success
 */

exports.initDir = function (dir, opt, callback) {
    kansorc.loadFile(path.join(dir, '/.kansorc'), function (err, _settings) {
        if (err) {
            return callback(err);
        }
        if (_settings.repositories && !opt.fixed_repositories) {
            // overwrite repository list with package directory's list
            opt.repositories = _settings.repositories;
        }
        settings.load(dir, function (err, cfg) {
            if (err) {
                return callback(err);
            }
            callback(null, opt, cfg);
        });
    });
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
    exports.initDir(dir, opt, function (err, opt, cfg) {
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
        var pkg = {
            config: cfg,
            source: 'root'
        };
        logger.info('Building version tree...');
        tree.build(pkg, sources, function (err, packages) {
            if (err) {
                return callback(err);
            }
            exports.installTree(packages, opt, callback);
        });
    });
};


/**
 * Installs packages in a version tree that are from remote sources (tmp
 * directory, repositories). Uses the set current_version for each package.
 *
 * @param {Object} packages - the version tree to install
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

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
    }, function (err) {
        if (err) {
            return callback(err);
        }
        // report packages that are no-longer used
        exports.checkUnused(packages, opt, callback);
    });
};


/**
 * Install a package by name. This is used on the command-line and can parse
 * 'package@version' etc. The package will be installed from the available
 * repositories with the range requirements of the current project direcotry
 * taken into account.
 *
 * @param {String} name - the name (with option @version) of the package
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.installName = function (name, opt, callback) {
    var range = null;
    if (!range && name.indexOf('@') !== -1) {
        var parts = name.split('@');
        name = parts[0];
        range = parts.slice(1).join('@');
    }
    exports.initDir('.', opt, function (err, opt, cfg) {
        if (err) {
            return callback(err);
        }
        var sources = [
            exports.dirSource(opt.target_dir),
            exports.repoSource(opt.repositories)
        ];
        var pkg1 = {
            config: cfg,
            source: 'root'
        };
        logger.info('Building version tree...');
        tree.build(pkg1, sources, function (err, packages) {
            if (err) {
                return callback(err);
            }
            tree.addDependency(
                cfg.name, name, range, sources, packages,
                function (err, packages) {
                    if (err) {
                        return callback(err);
                    }
                    exports.installTree(packages, opt, callback);
                }
            );
        });
    });
};


/**
 * Installs a package from a repository. No dependency checks are made.
 *
 * @param {String} name - the package name
 * @param {String} range - the version range or number
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

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


/**
 * Copies a directory into the local target directory. Writes log messages
 * during this process.
 *
 * @param {String} name - the name of the package being copied
 * @param {String} v - the version of the package
 * @param {Boolean} from_cache - whether we're installing a cached package
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

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
    pathExists(p, function (exists) {
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


/**
 * Wraps a callback to make sure temporary files are deleted even if an
 * error occurred.
 *
 * @param {Function} fn - the callback function to wrap
 * @param {Array} tmp_paths - the files/directories to remove
 * @returns {Function}
 */

exports.cleanupTmp = function (fn, tmp_paths) {
    // clean up tmp dir after attempted install, even if error
    var _fn = fn;
    return function (err) {
        var args = arguments;
        var that = this;
        utils.rm('-rf', tmp_paths, function (err2) {
            if (err2) {
                // log this error even though it won't make it to the callback
                logger.error(err2);
            }
            _fn.apply(that, args);
        });
    };
};


/**
 * Copies a file into the kanso temporary directory.
 *
 * @param {String} filename - the file to copy
 * @param {Function} callback
 */

exports.cpTmp = function (filename, callback) {
    var tmp = repository.TMP_DIR + '/' + path.basename(filename);
    utils.ensureDir(repository.TMP_DIR, function (err) {
        if (err) {
            return callback(err);
        }
        if (filename === tmp) {
            // installing from a file in tmp already
            return callback(null, tmp);
        }
        utils.cp('-r', filename, tmp, function (err) {
            if (err) {
                return callback(err);
            }
            callback(null, tmp);
        });
    });
};


/**
 * Prepares a .tar.gz file before installation. Copies it to the tmp directory,
 * extracts it, then reads the contents of it's kanso.json file.
 *
 * @param {String} filename - the .tar.gz file to prepare
 * @param {Function} callback - returns the values from kanso.json and
 *     the path of the extracted package directory
 */

exports.prepareFile = function (filename, callback) {
    exports.cpTmp(filename, function (err, tmp) {
        if (err) {
            return callback(err);
        }
        var tmp_extracted = repository.TMP_DIR + '/package';
        tar.extract(tmp, function (err) {
            if (err) {
                return callback(err);
            }
            settings.load(tmp_extracted, function (err, cfg) {
                callback(err, cfg, tmp_extracted, tmp);
            });
        });
    });
};


/**
 * Inserts a possible future dependency into the tree manually that may not
 * be available from the source functions. Using this we can 'prep' a version
 * tree with a package we know will be available later. This happens when
 * building a version tree before adding a package from a file.
 *
 * @param {Object} cfg - the kanso.json values for the package
 * @param {String} filename - the filename the package will be installed from
 * @param {String} tmpdir - the extracted package in the tmp directory
 * @param {Object} packages - the version tree to update (optional)
 * @return {Object} - returns the updated version tree
 */

exports.prepareTree = function (cfg, filename, tmpdir, /*optional*/packages) {
    packages = packages || {};
    packages[cfg.name] = tree.createPackage([]);
    packages[cfg.name].versions[cfg.version] = {
        source: 'tmp',
        path: tmpdir,
        basename: path.basename(filename),
        config: cfg
    };
    return packages;
};


/**
 * Install a package from a .tar.gz file.
 *
 * @param {String} filename - the .tar.gz file to install
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.installFile = function (filename, opt, callback) {
    exports.prepareFile(filename, function (err, cfg, tdir, tfile) {

        // clean up tmp dir after attempted install, even if error
        callback = exports.cleanupTmp(callback, [tfile, tdir]);

        if (err) {
            return callback(err);
        }

        exports.initDir('.', opt, function (err, opt, rootcfg) {
            if (err) {
                return callback(err);
            }
            var sources = [
                exports.dirSource(opt.target_dir),
                exports.repoSource(opt.repositories)
            ];
            var packages = exports.prepareTree(cfg, filename, tdir);
            var root = {
                config: rootcfg,
                source: 'root'
            };
            logger.info('Building version tree...');
            tree.extend(root, sources, packages, function (err, packages) {
                if (err) {
                    return callback(err);
                }
                tree.addDependency(
                    rootcfg.name, cfg.name, rootcfg.version, sources, packages,
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


/**
 * Install a .tar.gz file from a URL.
 *
 * @param {String} url - the URL of the .tar.gz file
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.installURL = function (url, opt, callback) {
    logger.info('downloading', url);
    repository.download(url, function (err, filename) {
        if (err) {
            return callback(err);
        }
        exports.installFile(filename, opt, callback);
    });
};


/**
 * Checks the packages directory for packages not in the provided version
 * tree.
 *
 * @param {Object} packages - the version tree to compare against
 * @param {Object} opt - the options object
 * @param {Function} callback
 */

exports.checkUnused = function (packages, opt, callback) {
    clean.unusedDirsTree(packages, opt, function (err, dirs) {
        if (err) {
            return callback(err);
        }
        if (dirs.length) {
            var names = dirs.map(function (d) {
                return path.relative('.', d);
            });
            console.log(
                '\n' +
                'The following packages are no longer required, ' +
                'and can be removed\nby running "kanso clean":\n' +
                '    ' + names.join('\n    ') +
                '\n'
            );
        }
        return callback();
    });
};
