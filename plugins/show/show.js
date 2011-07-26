var utils = require('../../lib/utils'),
    packages = require('../../lib/packages'),
    logger = require('../../lib/logger'),
    couchdb = require('../../lib/couchdb'),
    argParse = require('../../lib/args').parse;


exports.summary = 'Load a project and output resulting JSON';

exports.usage = '' +
'kanso show [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH     Path to project directory to show (defaults to ".")';


exports.run = function (settings, plugins, args) {
    var a = argParse(args, {
        'minify': {match: '--minify'},
        'minify_attachments': {match: '--minify-attachments'},
        'baseURL': {match: '--baseURL', value: true}
    });
    var dir = utils.abspath(a.positional[0] || '.');

    // suppress logger output
    logger.level = 'error';

    exports.loadApp(plugins, dir, function (err, doc, cfg) {
        if (err) {
            return logger.error(err);
        }
        logger.clean_exit = true;
        console.log(JSON.stringify(doc, null, 4));
    });
};

exports.loadApp = function (plugins, dir, callback) {
    var paths = [__dirname + '/../../packages'];
    packages.load(plugins, dir, true, paths, null, callback);
};
