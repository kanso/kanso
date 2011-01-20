var kanso = require('../kanso'),
    logger = require('../logger');


exports.summary = 'Create a new project skeleton';


exports.run = function (args) {
    var dir = args[0];
    kanso.create(dir, function (err) {
        if (err) {
            return logger.error(err);
        }
        logger.end(utils.abspath(dir));
    });
};
