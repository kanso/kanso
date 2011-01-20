var kanso = require('../kanso'),
    logger = require('../logger');


exports.summary = 'Create a new project skeleton';
exports.usage = 'kanso create PATH';


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
