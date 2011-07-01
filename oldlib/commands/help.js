var commands = require('../commands'),
    utils = require('../utils'),
    logger = require('../logger');


exports.summary = 'Show help specific to a command';
exports.usage = '' +
'kanso help [COMMAND]\n' +
'\n' +
'Parameters:\n' +
'  COMMAND      The kanso command to show help on\n' +
'\n' +
'Available commands:\n';

// add summary of commands to exports.usage
var len = utils.longest(Object.keys(commands));
Object.keys(commands).forEach(function (k) {
    exports.usage += '  ' + utils.padRight(k, len);
    exports.usage += '    ' + commands[k].summary + '\n';
});


exports.run = function (args) {
    if (!args.length) {
        console.log('Usage: ' + exports.usage);
        logger.clean_exit = true;
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
