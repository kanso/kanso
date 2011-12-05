var semver = require('node-semver/semver'),
    logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
    kansorc = require('../kansorc'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    async = require('async'),
    path = require('path');


exports.summary = 'Fetch dependencies for a package from repositories';

exports.usage = '' +
'kanso fetch [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Package to fetch dependencies for (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --force, -f    Overwrite existing packages in target directory\n' +
'  --repo         Source repository URL (otherwise uses settings in kansorc)';


// set when run() is called
var OPTIONS = null;

// stores the version range requirements for each package
var pkg_ranges = {};

// remembers if a package has already been removed when doing fetch -f
// otherwise, conflicting versions may overwrite each other without warning
var removed = {};

var fetched = [];
var target_dir = './packages';
var repos = [];


function isFetched(name, version) {
    for (var i = 0; i < fetched.length; i++) {
        if (fetched[i].name === name && fetched[i].version === version) {
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
                    if (!isFetched(name, cfg.version)) {
                        logger.info('skipping', name + ' (already exists)');
                    }
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

function worker(task, callback) {
    repository.resolve(task.name, task.range, repos, function (err, v, data, repo) {
        if (err) {
            return logger.error(err);
        }
        if (isFetched(task.name, v)) {
            return callback();
        }
        install(task.name, v, data, repo, task.parent, function (err, version, cfg) {
            if (err) {
                return logger.error(err);
            }
            fetched.push({
                name: task.name,
                version: version,
                parent: task.parent
            });
            if (cfg.dependencies) {
                fetchDeps(cfg.dependencies, cfg.name);
            }
            callback();
        });
    });
}

// the concurrency of fetch requests
var concurrency = 1;
var queue = async.queue(worker, concurrency);

function fetchDeps(deps, parent) {
    Object.keys(deps).forEach(function (name) {
        queue.push({name: name, range: deps[name], parent: parent});
    });
}


exports.run = function (_settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true},
        'force': {match: ['-f', '--force']}
    });
    var dir = utils.abspath(a.positional[0] || '.');
    kansorc.extend(_settings, dir + '/.kansorc', function (err, _settings) {
        target_dir = path.join(dir, 'packages');
        repos = a.options.repo ? [a.options.repo]: _settings.repositories;
        OPTIONS = a.options;

        settings.load(dir, function (err, cfg) {
            if (err) {
                return logger.error(err);
            }
            if (!cfg.dependencies) {
                logger.info('No dependencies specified');
                return logger.end();
            }
            queue.drain = function () {
                return logger.end();
            };
            if (cfg.dependencies) {
                fetchDeps(cfg.dependencies, cfg.name);
            }
        });
    });
};
