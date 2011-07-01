var kanso = require('../kanso'),
    utils = require('../utils'),
    logger = require('../logger');


exports.summary = 'Create a new project skeleton';
exports.usage = '' +
'kanso create PATH\n' +
'\n' +
'Parameters:\n' +
'  PATH     Path to create a new project skeleton at, project name\n' +
'           defaults to last directory in this path\n';


exports.run = function (args) {
    if (!args.length) {
        logger.error('No target path specified');
        logger.info('Usage: ' + exports.usage);
        return;
    }
    var dir = args[0];
    kanso.create(dir, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end(utils.abspath(dir));
    });
};
