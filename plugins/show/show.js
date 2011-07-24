var utils = require('../../lib/utils'),
    packages = require('../../lib/packages'),
    logger = require('../../lib/logger');


exports.summary = 'Load a project and output resulting JSON';

exports.usage = '' +
'kanso show [PATH]\n' +
'\n' +
'Parameters:\n' +
'  PATH     Path to project directory to show (defaults to ".")';


exports.run = function (settings, plugins, args) {
    var dir = utils.abspath(args[0] || '.');
    packages.load(plugins, dir, true, [], null, function (err, doc) {
        if (err) {
            return logger.error(err);
        }
        // output to console (not a log entry, actual output)
        console.log(JSON.stringify(doc, null, 4));
        logger.clean_exit = true;
    });
};
