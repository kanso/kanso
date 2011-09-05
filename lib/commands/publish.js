var logger = require('../logger'),
    repository = require('../repository'),
    argParse = require('../args').parse;


exports.summary = 'Publish a package to a repository';

exports.usage = '' +
'kanso publish [PACKAGE_PATH]\n' +
'\n' +
'Parameters:\n' +
'  PACKAGE_PATH    Path to package directory to pack (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --repo    Target repository URL (otherwise uses "default" in kansorc)'


exports.run = function (_settings, args) {
    var a = argParse(args, {
        'repo': {match: '--repo', value: true}
    });
    var dir = a.positional[0] || '.';
    var repo = a.options.repo || _settings.repositories['default'];
    repository.publish(dir, repo, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end();
    });
};
