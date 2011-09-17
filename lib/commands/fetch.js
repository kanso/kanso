var logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    async = require('../../deps/async'),
    path = require('path');


exports.summary = 'Fetch dependencies for a package from repositories';

exports.usage = '' +
'kanso fetch [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Package to fetch dependencies for (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --repo    Source repository URL (otherwise uses "default" in kansorc)';


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

function install(name, range, callback) {
    path.exists(target_dir + '/' + name, function (exists) {
        if (exists) {
            return callback(new Error(
                '"' + name + '" already exists in ' + target_dir
            ));
        }
        repository.fetch(name, range, repo, function (err, tfile, cdir, v, doc) {
            if (err) {
                return callback(err);
            }
            var path = target_dir + '/' + name;
            utils.ensureDir(target_dir, function (err) {
                if (err) {
                    return callback(err);
                }
                utils.cp('-r', cdir, path, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, v, doc);
                });
            });
        });
    });
}

function worker(task, callback) {
    install(task.name, task.range, function (err, version, doc) {
        if (err) {
            return logger.error(err);
        }
        fetched.push({name: task.name, version: version});
        if (doc.dependencies) {
            fetchDeps(doc.dependecies);
        }
        callback();
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
        'repo': {match: '--repo', value: true}
    });
    var dir = utils.abspath(a.positional[0] || '.');
    target_dir = path.join(dir, 'packages');
    repo = a.options.repo || _settings.repositories['default'];

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
        fetchDeps(cfg.dependencies);
    });
};
