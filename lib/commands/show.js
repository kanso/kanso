var kanso = require('../kanso'),
    logger = require('../logger'),
    settings = require('../settings');


exports.summary = 'Load a project and output resulting JSON';
exports.usage = 'kanso show PATH';


exports.run = function (args) {
    var dir = args[0] || '.';
    settings.load(dir, function (err, settings) {
        if (err) {
            return logger.error(err);
        }
        kanso.load(dir, settings, function (err, doc) {
            if (err) {
                return logger.error(err);
            }
            // output to console (not a log entry, actual output)
            console.log(JSON.stringify(doc, null, 4));
            logger.clean_exit = true;
        });
    });
};
