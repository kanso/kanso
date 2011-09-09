var logger = require('../logger'),
    utils = require('../utils'),
    repository = require('../repository'),
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
'  --repo    Source repository URL (otherwise uses "default" in kansorc)';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true}
    });
    var target_dir = a.positional[1] || './packages';
    var name = a.positional[0];
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

    path.exists(target_dir + '/' + name, function (exists) {
        if (exists) {
            return logger.error(
                '"' + name + '" already exists in ' + target_dir
            );
        }
        repository.fetch(name, version, repo, function (err, tfile, cachedir) {
            if (err) {
                return logger.error(err);
            }
            var path = target_dir + '/' + name;
            utils.ensureDir(target_dir, function (err) {
                if (err) {
                    return logger.error(err);
                }
                utils.cp('-r', cachedir, path, function (err) {
                    if (err) {
                        return logger.error(err);
                    }
                    logger.end();
                });
            });
        });
    });
};
