var logger = require('../logger'),
    async = require('../../deps/async'),
    utils = require('../utils'),
    repository = require('../repository'),
    tar = require('../tar'),
    settings = require('../settings'),
    argParse = require('../args').parse,
    path = require('path');


exports.summary = 'Install a package from a repository';

exports.usage = '' +
'kanso install PACKAGE[@VERSION] [TARGET_DIR]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE       Package name to install\n' +
'  VERSION       Package version to install\n' +
'  TARGET_DIR    Directory to install package to (defaults to ./packages)\n' +
'\n' +
'Options:\n' +
'  --force, -f    Overwrite existing packages in target directory\n' +
'  --repo         Source repository URL (otherwise uses "default" in kansorc)';


function install(repo, target_dir, name, version, options) {
    path.exists(target_dir + '/' + name, function (exists) {
        if (exists) {
            if (options.force) {
                logger.info('removing', name);
                utils.rm('-rf', target_dir + '/' + name, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    process.nextTick(function () {
                        install(repo, target_dir, name, version, options);
                    });
                });
            }
            else {
                logger.error('"' + name + '" already exists in ' + target_dir);
            }
            return;
        }
        repository.fetch(name, version, repo,
            function (err, tfile, cachedir, v, doc, from_cache) {
                if (err && err.response && err.response.statusCode === 401) {
                    logger.error(err);
                    utils.getAuth(repo, function (err, new_repo) {
                        if (err) {
                            return callback(err);
                        }
                        install(new_repo, target_dir, name, version);
                    });
                    return;
                }
                if (err) {
                    return logger.error(err);
                }
                var path = target_dir + '/' + name;
                utils.ensureDir(target_dir, function (err) {
                    if (err) {
                        return logger.error(err);
                    }
                    logger.info(
                        'installing',
                        name + '@' + v + (from_cache ? ' (cached)': '')
                    );
                    utils.cp('-r', cachedir, path, function (err) {
                        if (err) {
                            return logger.error(err);
                        }
                        logger.end();
                    });
                });
            }
        );
    });
}

function installFile(file, target_dir, options, callback) {
    var tmp = repository.TMP_DIR + '/' + path.basename(file);
    var tmp_extracted = repository.TMP_DIR + '/package';

    var _callback = callback;
    var callback = function (err) {
        var args = arguments;
        var that = this;
        utils.rm('-rf', [tmp, tmp_extracted], function (err2) {
            if (!err && err2) {
                _callback(err2);
            }
            else {
                if (err2) {
                    logger.error(err2);
                }
                _callback.apply(that, args);
            }
        });
    };

    async.series({
        tmpdir: async.apply(utils.ensureDir, repository.TMP_DIR),
        dir: async.apply(utils.ensureDir, target_dir),
        cp: async.apply(utils.cp, '-r', file, tmp),
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
                if (options.force) {
                    logger.info('removing', name);
                    utils.rm('-rf', tpath, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        process.nextTick(function () {
                            installFile(file, target_dir, options, callback);
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
            utils.cp('-r', tmp_extracted, tpath, callback);
        });
    });
}

exports.run = function (settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true},
        'force': {match: ['--force', '-f']}
    });
    var target_dir = a.positional[1] || './packages';
    var name = a.positional[0];
    path.exists(name, function (exists) {
        if (exists) {
            // attempting to install a .tar.gz file directly
            installFile(name, target_dir, a.options, function (err) {
                if (err) {
                    return logger.error(err);
                }
                logger.end();
            });
        }
        else {
            var version = 'latest';
            if (!name) {
                return logger.error('No package name specified');
            }
            if (name.indexOf('@') !== -1) {
                var parts = name.split('@');
                name = parts[0];
                version = parts.slice(1).join('@');
            }
            var repo = a.options.repo || settings.repositories['default'];
            install(repo, target_dir, name, version, a.options);
        }
    });
};
