var utils = require('../utils'),
    logger = require('../logger'),
    repository = require('../repository'),
    argParse = require('../args').parse,
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


exports.summary = 'Publish a package to a repository';

exports.usage = '' +
'kanso publish [PACKAGE_PATH]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE_PATH    Path to package directory to pack (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --repo         Target repository URL (otherwise uses "default" in kansorc)\n' +
'  --force, -f    Overwrite if version is already published'


exports.run = function (settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true},
        'force': {match: ['--force', '-f']}
    });
    var dir = a.positional[0] || '.';
    var repo = a.options.repo || settings.repositories['default'];
    exports.publish(dir, repo, a.options, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end();
    });
};


exports.publish = function (dir, repo, options, callback) {
    var parsed = urlParse(repo);
    // if only a username has been specified, ask for password
    if (parsed.auth && parsed.auth.split(':').length === 1) {
        utils.getPassword(function (err, password) {
            delete parsed.host;
            parsed.auth += ':' + password;
            repo = urlFormat(parsed);
            exports.publish(dir, repo, options, callback);
        });
        return;
    }
    console.log('publishing to: ' + repo);
    repository.publish(dir, repo, options, function (err) {
        if (err && err.response && err.response.statusCode === 401) {
            logger.error(err);
            // TODO: prompt for user/pass
            utils.getAuth(repo, function (err, new_repo) {
                if (err) {
                    return callback(err);
                }
                exports.publish(dir, new_repo, options, callback);
            });
        }
        else {
            callback(err);
        }
    });
};
