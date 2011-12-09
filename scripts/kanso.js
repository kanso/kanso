#!/usr/bin/env node

var path = require('path'),
    utils = require('../src/kanso/utils'),
    kansorc = require('../src/kanso/kansorc'),
    logger = require('../src/kanso/logger'),
    commands = require('../src/kanso/commands');


var args = process.argv.slice(2);

for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--debug') {
        args.splice(i, 1);
        logger.level = 'debug';
    }
}

kansorc.load(function (err, settings) {

    function usage() {
        console.log('Usage: kanso COMMAND [ARGS]');
        console.log('');
        console.log('Available commands:');
        var len = utils.longest(Object.keys(commands));
        for (var k in commands) {
            console.log(
                '  ' + utils.padRight(k, len) + '    ' + commands[k].summary
            );
        }
        logger.clean_exit = true;
    }

    if (!args.length) {
        usage();
    }
    else {
        var cmd = args.shift();
        if (cmd === '-h' || cmd === '--help') {
            usage();
        }
        else if (cmd === '-v' || cmd === '--version') {
            utils.readJSON(__dirname + '/../package.json', function (err, pkg) {
                if (err) {
                    return logger.error(err);
                }
                logger.clean_exit = true;
                console.log(pkg.version);
            });
        }
        else if (cmd in commands) {
            commands[cmd].run(settings, args, commands);
        }
        else {
            logger.error('No such command: ' + cmd);
            usage();
        }
    }

});
