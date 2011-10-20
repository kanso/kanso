var logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    async = require('../../deps/async'),
    path = require('path');

var loadSettingsMemo = async.memoize(settings.load);


exports.summary = 'Fetch dependencies for a package from repositories';

exports.usage = '' +
'kanso fetch [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Package to fetch dependencies for (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --force, -f    Overwrite existing packages in target directory\n' +
'  --repo         Source repository URL (otherwise uses "default" in kansorc)';


// set when run() is called
var OPTIONS = null;

var fetched = [];
var target_dir = './packages';
var repo = null;

function checkVersionConflict(name, version) {
    for (var i = 0; i < fetched.length; i++) {
        if (fetched[i].name === name && fetched[i].version !== version) {
            throw new Error(
                'Conflicting versions for package "' + name + '": ' +
                version + ' and ' + fetched[i].version
            );
        }
    }
}

function isFetched(name, version) {
    for (var i = 0; i < fetched.length; i++) {
        if (fetched[i].name === name && fetched[i].version === version) {
            return true;
        }
    }
    return false;
}


function install(name, range, data, callback) {
    path.exists(target_dir + '/' + name, function (exists) {
        if (exists) {
            if (OPTIONS.force) {
                logger.info('removing', name);
                utils.rm('-rf', target_dir + '/' + name, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    process.nextTick(function () {
                        install(name, range, data, callback);
                    });
                });
            }
            else {
                loadSettingsMemo(target_dir + '/' + name, function (err, cfg) {
                    if (err) {
                        return callback(err);
                    }
                    if (!isFetched(name, cfg.version)) {
                        logger.info('skipping', name + ' (already exists)');
                    }
                    callback(null, cfg.version, cfg);
                });
            }
            return;
        }
        repository.fetch(name, range, repo,
            function (err, tfile, cdir, v, cfg, from_cache) {
                if (err && err.response && err.response.statusCode === 401) {
                    logger.error(err);
                    utils.getAuth(repo, function (err, new_repo) {
                        if (err) {
                            return callback(err);
                        }
                        repo = new_repo;
                        exports.install(name, range, data, callback);
                    });
                    return;
                }
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
    repository.resolve(task.name, task.range, repo, function (err, v, data) {
        if (err && err.response && err.response.statusCode === 401) {
            logger.error(err);
            utils.getAuth(repo, function (err, new_repo) {
                if (err) {
                    return callback(err);
                }
                repo = new_repo;
                worker(task, callback);
            });
            return;
        }
        if (err) {
            return logger.error(err);
        }
        if (isFetched(task.name, v)) {
            return callback();
        }
        install(task.name, v, data, function (err, version, cfg) {
            if (err) {
                return logger.error(err);
            }
            fetched.push({name: task.name, version: version});
            if (cfg.dependencies) {
                fetchDeps(cfg.dependencies);
            }
            callback();
        });
    });
}

// the concurrency of fetch requests
var concurrency = 1;
var queue = async.queue(worker, concurrency);

function fetchDeps(deps) {
    Object.keys(deps).forEach(function (name) {
        queue.push({name: name, range: deps[name]});
    });
}


exports.run = function (_settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true},
        'force': {match: ['-f', '--force']}
    });
    var dir = utils.abspath(a.positional[0] || '.');
    target_dir = path.join(dir, 'packages');
    repo = a.options.repo || _settings.repositories['default'];
    OPTIONS = a.options;

    loadSettingsMemo(dir, function (err, cfg) {
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
            fetchDeps(cfg.dependencies);
        }
    });
};
