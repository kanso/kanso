var semver = require('semver'),
    logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
    kansorc = require('../kansorc'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    tar = require('../tar'),
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


// set when run() is called
var OPTIONS = null;

// checked after queue.drain to see if it should exit cleanly
var ERRORS = false;

// stores the version range requirements for each package
var pkg_ranges = {};

// remembers if a package has already been removed when doing fetch -f
// otherwise, conflicting versions may overwrite each other without warning
var removed = {};

var processed = [];
var target_dir = './packages';
var repos = [];


function isProcessed(name, version) {
    for (var i = 0; i < processed.length; i++) {
        if (processed[i].name === name && processed[i].version === version) {
            return true;
        }
    }
    return false;
}

function getRanges(name) {
    var ranges = [];
    for (var k in (pkg_ranges[name] || {})) {
        ranges.push(pkg_ranges[name][k]);
    }
    return ranges;
}

function satisfiesAll(version, ranges) {
    for (var i = 0; i < ranges.length; i++) {
        if (!semver.satisfies(version, ranges[i])) {
            return false;
        }
    }
    return true;
};


function install(name, range, data, repo, parent, callback) {
    pkg_ranges[name] = pkg_ranges[name] || {};
    pkg_ranges[name][parent] = range;

    path.exists(target_dir + '/' + name, function (exists) {
        if (exists) {
            if (OPTIONS.force && !removed[name]) {
                logger.info('removing', name);
                utils.rm('-rf', target_dir + '/' + name, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    removed[name] = true;
                    process.nextTick(function () {
                        install(name, range, data, repo, parent, callback);
                    });
                });
            }
            else {
                settings.load(target_dir + '/' + name, function (err, cfg) {
                    if (err) {
                        return callback(err);
                    }
                    if (!satisfiesAll(cfg.version, getRanges(name))) {
                        var range_data = '';
                        for (var k in pkg_ranges[name]) {
                            range_data += '\n' + k + ' requires: ' +
                                pkg_ranges[name][k];
                        }
                        range_data += '\n' +
                            'Currently installed version: ' + cfg.version;

                        return callback(new Error(
                            'Conflicting version requirements for ' + name +
                            range_data
                        ));
                    }
                    logger.info('skipping', name + ' (already exists)');
                    callback(null, cfg.version, cfg);
                });
            }
            return;
        }
        repository.fetch(name, range, repos, data, repo,
            function (err, tfile, cdir, v, cfg, from_cache) {
                if (err) {
                    return callback(err);
                }
                var path = target_dir + '/' + name;
                logger.info(
                    'installing',
                    name + '@' + v + (from_cache ? ' (cached)': '')
                );
                utils.ensureDir(target_dir, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    utils.cp('-r', cdir, path, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, v, cfg);
                    });
                });
            }
        );
    });
}

// tries to find a satisfying package locally, otherwise checks repositories
exports.resolve = function (parent, name, range, repos, callback) {
    var pkgdir = path.join(target_dir, name);
    path.exists(path.join(pkgdir, 'kanso.json'), function (exists) {
        if (exists) {
            settings.load(pkgdir, function (err, cfg) {
                if (err) {
                    return callback(err);
                }
                if (semver.satisfies(cfg.version, range)) {
                    return callback(null, cfg.version, cfg, false);
                }
                else if (OPTIONS.force) {
                    repository.resolve(
                        name, range, repos, function (err, v, data, repo) {
                            if (err && err.notfound) {
                                return callback(new Error(
                                    'No package for ' + name + ' @ ' + range +
                                    '\nAvailable versions: ' + cfg.version
                                ));
                            }
                            else {
                                callback.apply(this, arguments);
                            }
                        }
                    );
                }
                else {
                    var range_data = '';
                    for (var k in pkg_ranges[name]) {
                        range_data += '\n' + k + ' requires: ' +
                            pkg_ranges[name][k];
                    }
                    range_data += '\n' + parent + ' requires: ' + range;
                    range_data += '\n' +
                        'Currently installed version: ' + cfg.version;

                    return callback(new Error(
                        'Conflicting version requirements for ' + name +
                        range_data
                    ));
                }
            });
        }
        else {
            repository.resolve(name, range, repos, callback);
        }
    });
};

function worker(task, callback) {
    var name = task.name;
    var range = task.range;
    var parent = task.parent;

    exports.resolve(parent, name, range, repos, function (err, v, data, repo) {
        if (err) {
            ERRORS = true;
            logger.error(err);
            return callback(err);
        }
        if (isProcessed(name, v)) {
            return callback();
        }
        processed.push({
            name: name,
            version: v,
            parent: parent
        });
        var cfg = data;
        if (repo) {
            cfg = data.versions[v];
        }
        if (cfg.dependencies && !OPTIONS['no-deps']) {
            fetchDeps(cfg.dependencies, cfg.name);
        }
        if (repo) {
            install(name, v, data, repo, parent, function (err) {
                if (err) {
                    ERRORS = true;
                    logger.error(err);
                    return callback(err);
                }
                callback();
            });
        }
        else {
            logger.info('skipping', name + ' (already exists)');
            callback();
        }
    });
}

// the concurrency of fetch requests
var concurrency = 5;
var queue = async.queue(worker, concurrency);

function fetchDeps(deps, parent) {
    Object.keys(deps).forEach(function (name) {
        queue.push({name: name, range: deps[name], parent: parent});
    });
}


exports.installDir = function (_settings, dir) {
    // install local package or project dir
    if (OPTIONS['no-deps']) {
        return logger.end();
    }
    kansorc.extend(_settings, dir + '/.kansorc', function (err, _settings) {
        settings.load(dir, function (err, cfg) {
            if (err) {
                ERRORS = true;
                return logger.error(err);
            }
            if (!cfg.dependencies) {
                logger.info('No dependencies specified');
                return logger.end();
            }
            queue.drain = function () {
                if (!ERRORS) {
                    return logger.end();
                }
            };
            if (cfg.dependencies && !OPTIONS['no-deps']) {
                fetchDeps(cfg.dependencies, cfg.name);
            }
        });
    });
};

exports.installFile = function (_settings, filename) {
    var tmp = repository.TMP_DIR + '/' + path.basename(filename);
    var tmp_extracted = repository.TMP_DIR + '/package';

    var callback = function (err) {
        var args = arguments;
        var that = this;
        utils.rm('-rf', [tmp, tmp_extracted], function (err2) {
            if (err2) {
                ERRORS = true;
                logger.error(err2);
            }
            else if (err) {
                ERRORS = true;
                logger.error(err);
            }
        });
    };

    async.series({
        tmpdir: async.apply(utils.ensureDir, repository.TMP_DIR),
        dir: async.apply(utils.ensureDir, target_dir),
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
        var tpath = target_dir + '/' + name;
        path.exists(tpath, function (exists) {
            if (exists) {
                if (OPTIONS.force) {
                    logger.info('removing', name);
                    utils.rm('-rf', tpath, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        process.nextTick(function () {
                            exports.installFile(_settings, filename);
                        });
                    });
                }
                else {
                    callback('"' + name + '" already exists in ' + target_dir);
                }
                return;
            }
            logger.info(
                'installing',
                name + '@' + v + ' (from file)'
            );
            utils.cp('-r', tmp_extracted, tpath, function (err) {
                if (err) {
                    return callback(err);
                }
                // note that the --packge-dir won't have changed so deps will
                // be installed in current packages dir alongside this one
                exports.installDir(_settings, tpath);
            });
        });
    });
};

exports.installName = function (_settings, name) {
    var version = 'latest';
    if (!name) {
        ERRORS = true;
        return logger.error('No package name specified');
    }
    if (name.indexOf('@') !== -1) {
        var parts = name.split('@');
        name = parts[0];
        version = parts.slice(1).join('@');
    }
    var deps = {};
    deps[name] = version || null;

    queue.drain = function () {
        if (!ERRORS) {
            return logger.end();
        }
    };
    fetchDeps(deps, null);
};


exports.installURL = function (_settings, target) {
    repository.download(target, function (err, filename) {
        if (err) {
            ERRORS = true;
            return logger.error(err);
        }
        exports.installFile(_settings, filename);
    });
};


exports.run = function (_settings, args) {
    var a = argParse(args, {
        'repository': {match: '--repository', value: true},
        'force': {match: ['-f', '--force']},
        'package-dir': {match: '--package-dir', value: true},
        'no-deps': {match: '--no-deps'}
    });

    // make sure package-dir is relative to current dir nor package paths

    OPTIONS = a.options;

    var pkg = a.positional[0] || '.';

    repos = _settings.repositories;
    if (a.options.repository) {
        repos = [a.options.repository];
    }

    target_dir = a.options['package-dir'];

    if (/^https?:\/\//.test(pkg)) {
        target_dir = target_dir || utils.abspath('packages');
        logger.info('installing from URL', pkg);
        return exports.installURL(_settings, pkg);
    }
    fs.stat(pkg, function (err, stats) {
        if (err) {
            // may not be a file
            target_dir = target_dir || utils.abspath('packages');
            logger.info('installing from repositories', pkg);
            return exports.installName(_settings, pkg);
        }
        if (stats.isDirectory()) {
            target_dir = target_dir || utils.abspath('packages', pkg);
            logger.info('installing from directory', pkg);
            return exports.installDir(_settings, pkg);
        }
        else if (stats.isFile()) {
            target_dir = target_dir || utils.abspath('packages');
            logger.info('installing from local file', pkg);
            return exports.installFile(_settings, pkg);
        }
        else {
            throw new Error('Unknown install target: ' + pkg);
        }
    });
};
