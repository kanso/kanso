var commands = require('../commands'),
    logger = require('../logger');


exports.summary = 'Show help specific to a command';
exports.usage = 'kanso help COMMAND'

exports.run = function (args) {
    if (!args.length) {
        logger.error('No commands specified');
        console.log('Usage: ' + exports.usage);
    }
    else {
        args.forEach(function (a) {
            var cmd = commands[a];
            if (cmd) {
                console.log(cmd.summary);
                console.log('Usage: ' + cmd.usage);
            }
        });
        logger.clean_exit = true;
    }
};
