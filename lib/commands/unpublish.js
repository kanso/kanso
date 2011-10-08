var utils = require('../utils'),
    logger = require('../logger'),
    repository = require('../repository'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Remove a published package from a repository';

exports.usage = '' +
'kanso unpublish PACKAGE[@VERSION]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE       Package name to unpublish\n' +
'  VERSION       Package version to unpublish, if no version is specified\n' +
'                all versions of the package are removed\n' +
'\n' +
'Options:\n' +
'  --repo    Target repository URL (otherwise uses "default" in kansorc)';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true},
        'force': {match: ['--force', '-f']}
    });
    var repo = a.options.repo || settings.repositories['default'];

    var name = a.positional[0];
    var version;

    if (!name) {
        return logger.error('No package name specified');
    }
    if (name.indexOf('@') !== -1) {
        var parts = name.split('@');
        name = parts[0];
        version = parts.slice(1).join('@');
    }

    exports.unpublish(repo, name, version, a.options, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end();
    });
};


exports.unpublish = function (repo, name, version, options, callback) {
    var parsed = urlParse(repo);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + password;
            repo = urlFormat(parsed);
            exports.unpublish(repo, name, version, options, callback);
        });
        return;
    }
    repository.unpublish(repo, name, version, options, function (err) {
        if (err && err.response && err.response.statusCode === 401) {
            logger.error(err);
            utils.getAuth(repo, function (err, new_repo) {
                if (err) {
                    return callback(err);
                }
                exports.unpublish(new_repo, name, version, options, callback);
            });
            return;
        }
        else {
            callback(err);
        }
    });
};
