var utils = require('../../lib/utils'),
    plugins_module = require('../../lib/plugins'),
    logger = require('../../lib/logger');


exports.summary = 'Show help specific to a command';

exports.usage = '' +
    'kanso help [COMMAND]\n' +
    '\n' +
    'Parameters:\n' +
    '  COMMAND      The kanso command to show help on\n' +
    '\n' +
    'Available commands:\n';


exports.run = function (settings, plugins, args) {
    var commands = plugins_module.commands(plugins);

    // add summary of commands to exports.usage
    var len = utils.longest(Object.keys(commands));
    Object.keys(commands).forEach(function (k) {
        exports.usage += '  ' + utils.padRight(k, len);
        exports.usage += '    ' + commands[k].summary + '\n';
    });

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
