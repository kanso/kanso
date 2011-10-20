var utils = require('../utils'),
    packages = require('../packages'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    kansorc = require('../kansorc'),
    argParse = require('../args').parse;


exports.summary = 'Load a project and output resulting JSON';

exports.usage = '' +
'kanso show [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH    Path to project directory to show (defaults to ".")\n' +
'\n' +
'Options:\n' +
'  --minify    Compress CommonJS modules attachment using UglifyJS';


exports.run = function (settings, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'}
        //'minify_attachments': {match: '--minify-attachments'},
        //'baseURL': {match: '--baseURL', value: true}
    });
    var dir = utils.abspath(a.positional[0] || '.');
    kansorc.extend(settings, dir + '/.kansorc', function (err, settings) {
        if (err) {
            return logger.error(err);
        }

        // suppress logger output
        logger.level = 'error';

        exports.loadApp(dir, a.options, settings, function (err, doc, cfg) {
            if (err) {
                return logger.error(err);
            }
            logger.clean_exit = true;
            console.log(JSON.stringify(doc, null, 4));
        });
    });
};

exports.loadApp = function (dir, options, settings, callback) {
    var paths = settings.package_paths || [];
    packages.load(dir, true, paths, null, options, callback);
};
